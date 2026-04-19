export const X_USERNAME = "barterpayments";
export const X_PROFILE_URL = `https://x.com/${X_USERNAME}`;
export const X_MENTIONS_URL = `https://x.com/search?q=%40${X_USERNAME}&src=typed_query&f=live`;

const X_API_BASE_URL = "https://api.x.com/2";
const X_POSTS_LIMIT = 5;
const X_MENTIONS_LIMIT = 6;

type XUserLookupResponse = {
  data?: {
    id: string;
    name: string;
    username: string;
    profile_image_url?: string;
  };
};

type XTimelineResponse = {
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

type XFeedItem = {
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

export type XPost = XFeedItem;
export type XMention = XFeedItem;

export type XPostsPayload = {
  enabled: boolean;
  posts: XPost[];
  profileUrl: string;
  username: string;
  fetchedAt: string;
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

async function getXAccount(bearerToken: string) {
  const userLookupUrl = new URL(`${X_API_BASE_URL}/users/by/username/${X_USERNAME}`);
  userLookupUrl.searchParams.set("user.fields", "name,username,profile_image_url");

  const userLookup = await fetchFromX<XUserLookupResponse>(userLookupUrl.toString(), bearerToken);
  const account = userLookup.data;

  if (!account?.id) {
    throw new Error(`Unable to resolve X user ID for ${X_USERNAME}`);
  }

  return account;
}

function buildFeedItem(
  item: NonNullable<XTimelineResponse["data"]>[number],
  usersById: Map<string, NonNullable<NonNullable<XTimelineResponse["includes"]>["users"]>[number]>,
  fallbackAuthor: {
    name: string;
    username: string;
    profile_image_url?: string;
  }
): XFeedItem {
  const author = usersById.get(item.author_id ?? "") ?? fallbackAuthor;

  return {
    id: item.id,
    text: item.text,
    createdAt: item.created_at ?? null,
    url: `${X_PROFILE_URL}/status/${item.id}`,
    author: {
      name: author.name,
      username: author.username,
      avatarUrl: author.profile_image_url ?? null,
    },
    metrics: {
      likes: item.public_metrics?.like_count ?? 0,
      replies: item.public_metrics?.reply_count ?? 0,
      reposts: item.public_metrics?.retweet_count ?? 0,
      quotes: item.public_metrics?.quote_count ?? 0,
    },
  };
}

export async function getXPosts(): Promise<XPostsPayload> {
  const bearerToken = getBearerToken();
  const fetchedAt = new Date().toISOString();

  if (!bearerToken) {
    return {
      enabled: false,
      posts: [],
      profileUrl: X_PROFILE_URL,
      username: X_USERNAME,
      fetchedAt,
    };
  }

  try {
    const account = await getXAccount(bearerToken);
    const postsUrl = new URL(`${X_API_BASE_URL}/users/${account.id}/tweets`);
    postsUrl.searchParams.set("max_results", String(X_POSTS_LIMIT));
    postsUrl.searchParams.set("exclude", "retweets,replies");
    postsUrl.searchParams.set("tweet.fields", "created_at,public_metrics");

    const postsResponse = await fetchFromX<XTimelineResponse>(postsUrl.toString(), bearerToken);
    const posts = (postsResponse.data ?? []).map((item) =>
      buildFeedItem(item, new Map(), account)
    );

    return {
      enabled: true,
      posts,
      profileUrl: X_PROFILE_URL,
      username: X_USERNAME,
      fetchedAt,
    };
  } catch (error) {
    console.error("[X posts] Failed to fetch posts", error);
    return {
      enabled: false,
      posts: [],
      profileUrl: X_PROFILE_URL,
      username: X_USERNAME,
      fetchedAt,
    };
  }
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
    const account = await getXAccount(bearerToken);

    const mentionsUrl = new URL(`${X_API_BASE_URL}/users/${account.id}/mentions`);
    mentionsUrl.searchParams.set("max_results", String(X_MENTIONS_LIMIT));
    mentionsUrl.searchParams.set("expansions", "author_id");
    mentionsUrl.searchParams.set("tweet.fields", "created_at,public_metrics");
    mentionsUrl.searchParams.set("user.fields", "name,username,profile_image_url");

    const mentionsResponse = await fetchFromX<XTimelineResponse>(mentionsUrl.toString(), bearerToken);
    const usersById = new Map(
      (mentionsResponse.includes?.users ?? []).map((user) => [user.id, user])
    );

    const mentions = (mentionsResponse.data ?? []).map((item) =>
      buildFeedItem(item, usersById, account)
    );

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
