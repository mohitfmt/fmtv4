"use client";

import { useEffect } from "react";

const OutBrainWidget = ({ fullUrl }: { fullUrl: string }) => {
  useEffect(() => {
    // Function to replace Outbrain logo
    const replaceLogo = () => {
      const logoContainer = document.querySelector('.ob_auto_logo_container');
      if (logoContainer) {
        const originalLogo = logoContainer.querySelector('.ob_auto_logo');
        if (originalLogo) {
          // Update attributes of existing logo
          originalLogo.setAttribute('alt', 'Outbrain Logo');
          originalLogo.setAttribute('width', '100');
          originalLogo.setAttribute('height', '30');
          originalLogo.setAttribute('loading', 'lazy');
        }
      }
    };

    const script = document.createElement("script");
    script.src = "//widgets.outbrain.com/outbrain.js";
    script.defer = true;
    
    // Set up observer to watch for logo
    const observer = new MutationObserver(() => {
      if (document.querySelector('.ob_auto_logo')) {
        replaceLogo();
        observer.disconnect();
      }
    });

    script.onload = () => {
      const outbrainContainer = document.querySelector('.OUTBRAIN');
      if (outbrainContainer) {
        observer.observe(outbrainContainer, {
          childList: true,
          subtree: true
        });
      }
    };

    document.body.appendChild(script);

    return () => {
      observer.disconnect();
      document.body.removeChild(script);
    };
  }, []);

  return (
    <div
      className="OUTBRAIN"
      data-src={fullUrl}
      data-widget-id="AR_1"
      role="complementary"
      aria-label="Recommended content from around the web"
    />
  );
};

export default OutBrainWidget;