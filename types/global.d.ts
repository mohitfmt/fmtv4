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

interface MostViewedItem {
  uri: string;
  title: string;
  date: string;
  image?: string;
}
