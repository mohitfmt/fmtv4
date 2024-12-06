// global.d.ts

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
  googletag: any; // Add proper type if available
  pSUPERFLY: any; // Add proper type if available
}

interface PromptMomentNotification {
  isDisplayed: () => boolean;
  isSkippedMoment: () => boolean;
  getSkippedReason: () => string;
  isDismissedMoment: () => boolean;
  getDismissedReason: () => string;
  getMomentType: () => string;
}
