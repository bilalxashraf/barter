export const X_USERNAME = "barterpayments";
export const X_PROFILE_URL = `https://x.com/${X_USERNAME}`;
export const X_MENTIONS_URL = `https://x.com/search?q=%40${X_USERNAME}&src=typed_query&f=live`;

const X_API_BASE_URL = "https://api.x.com/2";
const X_MENTIONS_LIMIT = 6;

type XUserLookupResponse = {
  data?: {
    id: string;
    name: string;
    username: string;
  };
};

type XMentionsResponse = {
  data?: Array<{
    id: string;
    text: string;
    created_at?: string;
    author_id?: string;
    public_metrics?: {
      like_count?: number;
      reply_count?: number;
      retweet_count?: number;
      quote_count?: number;
    };
  }>;
  includes?: {
    users?: Array<{
      id: string;
      name: string;
      username: string;
      profile_image_url?: string;
    }>;
  };
};

export type XMention = {
  id: string;
  text: string;
  createdAt: string | null;
  url: string;
  author: {
    name: string;
    username: string;
    avatarUrl: string | null;
  };
  metrics: {
    likes: number;
    replies: number;
    reposts: number;
    quotes: number;
  };
};

export type XMentionsPayload = {
  enabled: boolean;
  mentions: XMention[];
  profileUrl: string;
  searchUrl: string;
  username: string;
  fetchedAt: string;
};

function getBearerToken() {
  return process.env.X_BEARER_TOKEN?.trim() || "";
}

async function fetchFromX<T>(url: string, bearerToken: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${bearerToken}`,
    },
    next: { revalidate: 300 },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`X API ${response.status}: ${body}`);
  }

  return (await response.json()) as T;
}

export async function getXMentions(): Promise<XMentionsPayload> {
  const bearerToken = getBearerToken();
  const fetchedAt = new Date().toISOString();

  if (!bearerToken) {
    return {
      enabled: false,
      mentions: [],
      profileUrl: X_PROFILE_URL,
      searchUrl: X_MENTIONS_URL,
      username: X_USERNAME,
      fetchedAt,
    };
  }

  try {
    const userLookupUrl = `${X_API_BASE_URL}/users/by/username/${X_USERNAME}`;
    const userLookup = await fetchFromX<XUserLookupResponse>(userLookupUrl, bearerToken);
    const userId = userLookup.data?.id;

    if (!userId) {
      throw new Error(`Unable to resolve X user ID for ${X_USERNAME}`);
    }

    const mentionsUrl = new URL(`${X_API_BASE_URL}/users/${userId}/mentions`);
    mentionsUrl.searchParams.set("max_results", String(X_MENTIONS_LIMIT));
    mentionsUrl.searchParams.set("expansions", "author_id");
    mentionsUrl.searchParams.set(
      "tweet.fields",
      "created_at,public_metrics"
    );
    mentionsUrl.searchParams.set("user.fields", "name,username,profile_image_url");

    const mentionsResponse = await fetchFromX<XMentionsResponse>(mentionsUrl.toString(), bearerToken);
    const usersById = new Map(
      (mentionsResponse.includes?.users ?? []).map((user) => [user.id, user])
    );

    const mentions = (mentionsResponse.data ?? []).map((mention) => {
      const author = usersById.get(mention.author_id ?? "");

      return {
        id: mention.id,
        text: mention.text,
        createdAt: mention.created_at ?? null,
        url: `${X_PROFILE_URL}/status/${mention.id}`,
        author: {
          name: author?.name ?? "X user",
          username: author?.username ?? "unknown",
          avatarUrl: author?.profile_image_url ?? null,
        },
        metrics: {
          likes: mention.public_metrics?.like_count ?? 0,
          replies: mention.public_metrics?.reply_count ?? 0,
          reposts: mention.public_metrics?.retweet_count ?? 0,
          quotes: mention.public_metrics?.quote_count ?? 0,
        },
      } satisfies XMention;
    });

    return {
      enabled: true,
      mentions,
      profileUrl: X_PROFILE_URL,
      searchUrl: X_MENTIONS_URL,
      username: X_USERNAME,
      fetchedAt,
    };
  } catch (error) {
    console.error("[X mentions] Failed to fetch mentions", error);
    return {
      enabled: false,
      mentions: [],
      profileUrl: X_PROFILE_URL,
      searchUrl: X_MENTIONS_URL,
      username: X_USERNAME,
      fetchedAt,
    };
  }
}
