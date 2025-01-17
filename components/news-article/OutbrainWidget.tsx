"use client";

import { useEffect } from "react";

const OutBrainWidget = ({ fullUrl }: { fullUrl: string }) => {
  useEffect(() => {
    const script = document.createElement("script");
    script.src = "//widgets.outbrain.com/outbrain.js";
    script.defer = true;
    document.body.appendChild(script);

    return () => {
      document.body.removeChild(script);
    };
  }, []);

  return <div className="OUTBRAIN" data-src={fullUrl} data-widget-id="AR_1" />;
};

export default OutBrainWidget;
