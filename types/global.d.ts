interface Window {
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

interface PromptMomentNotification {
  isDisplayed: () => boolean;
  isSkippedMoment: () => boolean;
  getSkippedReason: () => string;
  isDismissedMoment: () => boolean;
  getDismissedReason: () => string;
  getMomentType: () => string;
}
interface MostViewedItemType {
  uri: string;
  title: string;
  date: string;
  image?: string;
  slug: string;
}

interface CategoryNode {
  id: string;
  name: string;
  slug: string;
}

interface CategoryEdge {
  node: CategoryNode;
}

interface Categories {
  edges: CategoryEdge[];
}

interface Author {
  uri: string;
  slug: string;
  name: string;
  firstName: string;
  lastName: string;
  avatar: {
    url: string;
  };
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface Tag {
  id: string;
  name: string;
  slug: string;
  count: number;
  description: string;
  databaseId: number;
}

interface FeaturedImage {
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

interface PostsResponse {
  posts: {
    edges: Array<{
      node: PostCardProps;
    }>;
  };
}

interface AdsTargetingParams {
  pos: string;
  section: string[];
  key?: string[];
  articleId?: string;
  premium?: string;
  sponsored?: string;
}

interface SubCategoryPost {
  slug: string;
  posts: {
    edges: PostsResponse["posts"]["edges"];
  };
  bigImage: boolean;
}

interface CategoryLandingProps {
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

interface TaxQuery {
  taxArray: Array<{
    terms: string[];
    taxonomy: string;
    field: string;
    operator?: string;
  }>;
  relation: string;
}

interface PostsVariables {
  first: number;
  where?: {
    taxQuery?: TaxQuery;
    status?: string;
  };
}

interface VideoDetailPageProps {
  video: any;
  videos: any[];
  videoId: string;
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

interface TaxQuery {
  relation: "AND" | "OR";
  taxArray: {
    field: string;
    operator: string;
    taxonomy: string;
    terms: string[];
  }[];
}

interface OffsetPagination {
  offset: number;
  size: number;
}

interface SearchWhereClause {
  search: string | undefined;
  offsetPagination: OffsetPagination;
  taxQuery?: TaxQuery;
}

interface SearchVariables {
  where: SearchWhereClause;
}

interface ArticleData {
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