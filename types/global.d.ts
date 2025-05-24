// types/global.d.ts
export {};
declare namespace NodeJS {
  interface Global {
    /** Exposed when you run Node with --expose-gc */
    gc?: () => void;
  }
}

// 2) Also make `gc()` itself callable at top-level
declare let gc: (() => void) | undefined;

export interface Window {
  google?: {
    accounts: {
      id: {
        initialize: (input: object) => void;
        prompt: (
          momentListener?: (res: PromptMomentNotification) => void
        ) => void;
      };
    };
  };
  _sf_async_config: {
    uid: string | number;
    domain: string;
    useCanonical: boolean;
    path: string;
    title: string;
    sections: string;
    authors: string;
  };
  googletag: any;
  pSUPERFLY: any;

  _comscore: Array<{ c1: string; c2: string }>;
  COMSCORE: {
    beacon: (params: { c1: string; c2: string }) => void;
  };
  _sf_async_config: any;

  gtag: (...args: any[]) => void;
}

export interface PromptMomentNotification {
  isDisplayed: () => boolean;
  isSkippedMoment: () => boolean;
  getSkippedReason: () => string;
  isDismissedMoment: () => boolean;
  getDismissedReason: () => string;
  getMomentType: () => string;
}
export interface MostViewedItemType {
  uri: string;
  title: string;
  date: string;
  image?: string;
  slug: string;
}

export interface CategoryNode {
  id: string;
  name: string;
  slug: string;
}

export interface CategoryEdge {
  node: CategoryNode;
}

export interface Categories {
  edges: CategoryEdge[];
}

export interface Author {
  uri: string;
  slug: string;
  name: string;
  firstName: string;
  lastName: string;
  avatar: {
    url: string;
  };
}

export interface Category {
  id: string;
  name: string;
  slug: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
  count: number;
  description: string;
  databaseId: number;
}

export interface FeaturedImage {
  sourceUrl: string;
  mediaItemUrl: string;
}

export interface PostCardProps {
  id: string;
  title: string;
  slug: string;
  uri: string;
  date: string;
  dateGmt: string;
  excerpt?: string;
  categories?: {
    edges: Array<{
      node: Category;
    }>;
  };
  author?: {
    node?: {
      uri?: string;
      slug?: string;
      name?: string;
    };
  };
  tags?: {
    edges?: Array<{ node: Tag }>;
  };
  featuredImage: {
    node: {
      sourceUrl: string;
      mediaItemUrl: string;
    };
  };
}

export interface PostsResponse {
  posts: {
    edges: Array<{
      node: PostCardProps;
    }>;
  };
}

export interface AdsTargetingParams {
  pos: string;
  section: string[];
  key?: string[];
  articleId?: string;
  premium?: string;
  sponsored?: string;
}

export interface SubCategoryPost {
  slug: string;
  posts: {
    edges: PostsResponse["posts"]["edges"];
  };
  bigImage: boolean;
}

export interface CategoryLandingProps {
  posts: {
    edges: PostsResponse["posts"]["edges"];
  };
  currentPage: (typeof categoriesNavigation)[0] | undefined;
  error?: string;
  subCategoryPosts: SubCategoryPost[];
  AdsTargetingParams: {
    pos: string;
    section: string[];
  };
}

export interface TaxQuery {
  taxArray: Array<{
    terms: string[];
    taxonomy: string;
    field: string;
    operator?: string;
  }>;
  relation: string;
}

export interface PostsVariables {
  first: number;
  where?: {
    taxQuery?: TaxQuery;
    status?: string;
  };
}

export interface VideoDetailPageProps {
  video: any;
  videos: any[];
  videoId: string;
  initialPlaylistId: string;
  playlistId: string;
  metaData: {
    title: string;
    description: string;
    openGraph: any;
    twitter: any;
    keywords: string;
    category: string[];
  };
  videoArticles: any;
}
export interface VideoContentProps {
  video: any;
  videoId: string;
  shareUrl: string;
  shareTitle: string;
  shareThumbnail: string;
  tags: string[];
}

export interface VideoItem {
  id: string;
  snippet: {
    title: string;
    thumbnails: {
      high: {
        url: string;
      };
    };
    resourceId: {
      videoId: string;
    };
  };
}

export interface PlaylistVideos {
  playlistId: string;
  videos: VideoItem[];
  nextPageToken?: string;
}

export interface YouTubeChannelInfo {
  snippet?: {
    title?: string;
    description?: string;
    thumbnails?: {
      default?: {
        url?: string;
        width?: number;
        height?: number;
      };
    };
  };
  statistics?: {
    subscriberCount?: number;
  };
  id?: string;
}

export interface TaxQuery {
  relation: "AND" | "OR";
  taxArray: {
    field: string;
    operator: string;
    taxonomy: string;
    terms: string[];
  }[];
}

export interface OffsetPagination {
  offset: number;
  size: number;
}

export interface SearchWhereClause {
  search: string | undefined;
  offsetPagination: OffsetPagination;
  taxQuery?: TaxQuery;
}

export interface SearchVariables {
  where: SearchWhereClause;
}

export interface ArticleData {
  tags?: { edges?: { node?: { name?: string } }[] };
  uri?: string;
  content?: string;
  excerpt?: string;
  title?: string;
  keywords: { keywords: string };
  dateGmt?: string;
  modifiedGmt?: string;
  featuredImage?: {
    node?: {
      sourceUrl?: string;
      mediaDetails?: {
        height?: number;
        width?: number;
      };
    };
  };
  author: any;
  categories?: { edges?: { node?: { name?: string } }[] };
}

export interface HomePost {
  title: string;
  excerpt: string;
  slug: string;
  uri: string;
  date: string;
  featuredImage: {
    node: {
      sourceUrl: string;
    };
  };
  categories: {
    edges: Array<{
      node: {
        slug: string;
        name: string;
        id: string;
      };
    }>;
  };
  author: {
    node: {
      slug: string;
      name: string;
      firstName: string | null;
      lastName: string | null;
      avatar: {
        url: string;
      };
    };
  };
}
