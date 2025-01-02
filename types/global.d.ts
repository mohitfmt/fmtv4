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

export interface PostCardProps {
  id: string;
  title: string;
  slug: string;
  uri: string;
  date: string;
  excerpt?: string;
  categories?: {
    // Changed from any[] to proper typing
    edges: Array<>;
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


interface AdsTargetingParams {
  pos: string;
  section: string[];
  key?: string[]; 
  articleId?: string; 
  premium?: string; 
  sponsored?: string; 
}

