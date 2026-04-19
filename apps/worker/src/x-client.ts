import {
  channelReplySchema,
  normalizedSocialEventSchema,
  type ChannelReply,
  type ChannelAdapter,
  type NormalizedSocialEvent
} from "@barter/contracts";
import { normalizeXHandle } from "@barter/social";

const X_API_BASE_URL = "https://api.x.com/2";
const REFRESH_WINDOW_MS = 5 * 60 * 1000;

export type StoredXCredential = {
  accountId: string;
  externalUserId: string;
  handle: string;
  accessToken: string;
  refreshToken?: string;
  tokenType: string;
  scopes: string[];
  expiresAt?: string;
  metadata?: Record<string, unknown>;
};

type PersistedTokenPayload = {
  accountId: string;
  externalUserId: string;
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  scopes?: string[];
  expiresAt?: Date;
  metadata?: Record<string, unknown>;
};

type ResolveCredential = () => Promise<StoredXCredential | null>;
type PersistCredential = (input: PersistedTokenPayload) => Promise<void>;

type XBotClientOptions = {
  barterHandle: string;
  clientId?: string;
  clientSecret?: string;
  resolveCredential: ResolveCredential;
  persistCredential: PersistCredential;
  maxResults?: number;
};

type RefreshedToken = {
  accessToken: string;
  refreshToken?: string;
  tokenType?: string;
  scopes?: string[];
  expiresAt?: Date;
};

export class XBotClient {
  constructor(private readonly options: XBotClientOptions) {}

  async pollMentions(): Promise<NormalizedSocialEvent[]> {
    const credential = await this.getCredential(["tweet.read", "users.read"]);

    if (!credential) {
      return [];
    }

    const payload = await this.requestMentions(credential);
    const authorById = new Map(
      (payload.includes?.users ?? []).map((user) => [user.id, `@${normalizeXHandle(user.username)}`])
    );

    const events = (payload.data ?? [])
      .filter((tweet) => tweet.author_id !== credential.externalUserId)
      .map((tweet) =>
        normalizedSocialEventSchema.parse({
          externalEventId: tweet.id,
          externalConversationId: tweet.conversation_id ?? tweet.id,
          channel: "x",
          source: "polling",
          authorHandle:
            authorById.get(tweet.author_id) ?? `@user_${normalizeXHandle(tweet.author_id)}`,
          authorExternalId: tweet.author_id,
          text: tweet.text,
          rawPayload: tweet
        })
      );

    return events.sort(compareEventIdsAscending);
  }

  async postReply(reply: ChannelReply) {
    const parsed = channelReplySchema.parse(reply);
    const credential = await this.getCredential(["tweet.write", "users.read"]);

    if (!credential) {
      throw new Error(
        `No OAuth credential is stored for @${normalizeXHandle(this.options.barterHandle)}. Sign in once with the Barter X account to enable live replies.`
      );
    }

    const response = await this.requestJson<{
      data?: {
        id: string;
        text: string;
      };
    }>({
      credential,
      method: "POST",
      path: "/tweets",
      body: {
        text: truncateTweet(parsed.text),
        reply: {
          in_reply_to_tweet_id: parsed.targetEventId
        }
      }
    });

    if (!response.data?.id) {
      throw new Error("X reply response did not include a tweet id");
    }

    return {
      externalReplyId: response.data.id,
      deliveredAt: new Date().toISOString(),
      reply: parsed
    };
  }

  private async requestMentions(credential: StoredXCredential) {
    const query = new URLSearchParams({
      expansions: "author_id",
      "tweet.fields": "author_id,conversation_id,created_at",
      "user.fields": "username",
      max_results: String(this.options.maxResults ?? 25)
    });

    return this.requestJson<{
      data?: Array<{
        id: string;
        text: string;
        author_id: string;
        conversation_id?: string;
      }>;
      includes?: {
        users?: Array<{
          id: string;
          username: string;
        }>;
      };
    }>({
      credential,
      method: "GET",
      path: `/users/${credential.externalUserId}/mentions?${query.toString()}`
    });
  }

  private async requestJson<T>(input: {
    credential: StoredXCredential;
    method: "GET" | "POST";
    path: string;
    body?: Record<string, unknown>;
  }): Promise<T> {
    let credential = input.credential;

    for (let attempt = 0; attempt < 2; attempt += 1) {
      const response = await fetch(`${X_API_BASE_URL}${input.path}`, {
        method: input.method,
        headers: {
          Authorization: `${credential.tokenType || "Bearer"} ${credential.accessToken}`,
          ...(input.body ? { "Content-Type": "application/json" } : {})
        },
        ...(input.body ? { body: JSON.stringify(input.body) } : {})
      });

      if (response.ok) {
        return (await response.json()) as T;
      }

      if (response.status === 401 && credential.refreshToken && attempt === 0) {
        credential = await this.refreshCredential(credential);
        continue;
      }

      const errorBody = await response.text();
      throw new Error(`X API request failed: ${response.status} ${errorBody}`);
    }

    throw new Error("X API request failed after retry");
  }

  private async getCredential(requiredScopes: string[]): Promise<StoredXCredential | null> {
    const stored = await this.options.resolveCredential();
    if (!stored) {
      return null;
    }

    const missingScopes = requiredScopes.filter((scope) => !stored.scopes.includes(scope));
    if (missingScopes.length) {
      throw new Error(
        `OAuth credential for ${stored.handle} is missing required scopes: ${missingScopes.join(", ")}`
      );
    }

    if (shouldRefreshCredential(stored) && stored.refreshToken) {
      return this.refreshCredential(stored);
    }

    return stored;
  }

  private async refreshCredential(credential: StoredXCredential): Promise<StoredXCredential> {
    if (!credential.refreshToken) {
      throw new Error(`OAuth credential for ${credential.handle} cannot be refreshed`);
    }

    if (!this.options.clientId) {
      throw new Error("X_CLIENT_ID is required to refresh OAuth tokens");
    }

    const refreshed = await refreshAccessToken({
      clientId: this.options.clientId,
      refreshToken: credential.refreshToken,
      ...(this.options.clientSecret ? { clientSecret: this.options.clientSecret } : {})
    });

    await this.options.persistCredential({
      accountId: credential.accountId,
      externalUserId: credential.externalUserId,
      accessToken: refreshed.accessToken,
      ...(refreshed.refreshToken ?? credential.refreshToken
        ? {
            refreshToken: refreshed.refreshToken ?? credential.refreshToken
          }
        : {}),
      ...(refreshed.tokenType ?? credential.tokenType
        ? {
            tokenType: refreshed.tokenType ?? credential.tokenType
          }
        : {}),
      ...(refreshed.scopes ?? credential.scopes
        ? {
            scopes: refreshed.scopes ?? credential.scopes
          }
        : {}),
      ...(refreshed.expiresAt ? { expiresAt: refreshed.expiresAt } : {}),
      ...(credential.metadata ? { metadata: credential.metadata } : {})
    });

    return {
      ...credential,
      accessToken: refreshed.accessToken,
      ...(refreshed.refreshToken ?? credential.refreshToken
        ? {
            refreshToken: refreshed.refreshToken ?? credential.refreshToken
          }
        : {}),
      ...(refreshed.tokenType ?? credential.tokenType
        ? {
            tokenType: refreshed.tokenType ?? credential.tokenType
          }
        : {}),
      ...(refreshed.scopes ?? credential.scopes
        ? {
            scopes: refreshed.scopes ?? credential.scopes
          }
        : {}),
      ...(refreshed.expiresAt?.toISOString() ?? credential.expiresAt
        ? {
            expiresAt: refreshed.expiresAt?.toISOString() ?? credential.expiresAt
          }
        : {})
    };
  }
}

export class XApiChannelAdapter implements ChannelAdapter {
  readonly channel = "x" as const;

  constructor(private readonly client: XBotClient) {}

  async sendReply(reply: ChannelReply) {
    return this.client.postReply(reply);
  }
}

export function buildPollingCronExpression(intervalSeconds: number): string {
  const minutes = Math.max(1, Math.ceil(intervalSeconds / 60));
  return minutes >= 60 ? `0 */${Math.min(23, Math.max(1, Math.floor(minutes / 60)))} * * *` : `*/${minutes} * * * *`;
}

async function refreshAccessToken(input: {
  clientId: string;
  clientSecret?: string;
  refreshToken: string;
}): Promise<RefreshedToken> {
  const headers = new Headers({
    "Content-Type": "application/x-www-form-urlencoded"
  });

  if (input.clientSecret) {
    const basic = Buffer.from(`${input.clientId}:${input.clientSecret}`).toString("base64");
    headers.set("Authorization", `Basic ${basic}`);
  }

  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: input.refreshToken,
    client_id: input.clientId
  });

  const response = await fetch("https://api.x.com/2/oauth2/token", {
    method: "POST",
    headers,
    body
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`X token refresh failed: ${response.status} ${errorBody}`);
  }

  const payload = (await response.json()) as {
    access_token: string;
    refresh_token?: string;
    token_type?: string;
    scope?: string;
    expires_in?: number;
  };

  return {
    accessToken: payload.access_token,
    ...(payload.refresh_token ? { refreshToken: payload.refresh_token } : {}),
    ...(payload.token_type ? { tokenType: payload.token_type } : {}),
    ...(payload.scope ? { scopes: payload.scope.split(" ").filter(Boolean) } : {}),
    ...(payload.expires_in
      ? {
          expiresAt: new Date(Date.now() + payload.expires_in * 1000)
        }
      : {})
  };
}

function shouldRefreshCredential(credential: StoredXCredential): boolean {
  if (!credential.expiresAt) {
    return false;
  }

  return new Date(credential.expiresAt).getTime() <= Date.now() + REFRESH_WINDOW_MS;
}

function truncateTweet(text: string): string {
  return text.length <= 280 ? text : `${text.slice(0, 277)}...`;
}

function compareEventIdsAscending(a: NormalizedSocialEvent, b: NormalizedSocialEvent): number {
  try {
    const left = BigInt(a.externalEventId);
    const right = BigInt(b.externalEventId);

    if (left < right) {
      return -1;
    }

    if (left > right) {
      return 1;
    }

    return 0;
  } catch {
    return a.externalEventId.localeCompare(b.externalEventId);
  }
}
