import { useEffect, useState } from "react";
import parse from "html-react-parser";
import PostBody from "../news-article/PostBody";

interface PhotoDetailProps {
  content: string;
  additionalFields?: {
    categories: { edges: Array<{ node: { name: string } }> };
    tags: { edges: Array<{ node: { name: string } }> };
  };
}

interface ScriptDetail {
  src: string | null;
  content: string | null;
}

// Add custom CSS to handle caption background with theme support
const CUSTOM_STYLES = `
  /* Light theme styles */
  :root[data-theme="light"] .rbs-img-content {
    background-color: #ffffff !important;
    color: #000000 !important;
    padding: 12px !important;
    border-left: 1px solid #e5e7eb !important;
    border-right: 1px solid #e5e7eb !important;
    border-bottom: 1px solid #e5e7eb !important;
    border-top: none !important;
  }

  /* Dark theme styles */
  :root[data-theme="dark"] .rbs-img-content {
    background-color: rgba(0, 0, 0, 0.8) !important;
    color: #ffffff !important;
    padding: 12px !important;
    border-left: 1px solid #374151 !important;
    border-right: 1px solid #374151 !important;
    border-bottom: 1px solid #374151 !important;
    border-top: none !important;
  }

  /* Default styles (fallback) */
  .rbs-img-content {
    background-color: var(--background) !important;
    color: var(--foreground) !important;
    padding: 12px !important;
    border-top: none !important;
    margin-top: -1px !important; /* Remove any gap between image and caption */
  }
`;

const extractScripts = (
  htmlContent: string
): {
  upperContent: string;
  galleryContent: string;
  scriptDetails: ScriptDetail[];
} => {
  const container = document.createElement("div");
  container.innerHTML = htmlContent;

  const scripts: ScriptDetail[] = [];
  const galleryElements = container.querySelectorAll(
    '[id^="robo_gallery_main_block"]'
  );
  const styleElements = container.querySelectorAll("style, link");

  let upperContent = "";
  let galleryContent = "";

  galleryElements.forEach((el) => {
    galleryContent += el.outerHTML;
    el.remove();
  });

  styleElements.forEach((el) => {
    galleryContent += el.outerHTML;
    el.remove();
  });

  container.querySelectorAll("script").forEach((script) => {
    const src = script.getAttribute("src");
    const content = script.textContent || null;
    scripts.push({ src, content });
    script.remove();
  });

  upperContent = container.innerHTML;

  return {
    upperContent,
    galleryContent,
    scriptDetails: scripts,
  };
};

const PhotoDetail = ({ content, additionalFields }: PhotoDetailProps) => {
  const [upperContent, setUpperContent] = useState("");
  const [galleryContent, setGalleryContent] = useState("");
  const [scriptDetails, setScriptDetails] = useState<ScriptDetail[]>([]);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);

    // Add custom styles
    const styleElement = document.createElement("style");
    styleElement.textContent = CUSTOM_STYLES;
    document.head.appendChild(styleElement);

    return () => {
      styleElement.remove();
    };
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const result = extractScripts(content);
      setUpperContent(result.upperContent);
      setGalleryContent(result.galleryContent);
      setScriptDetails(result.scriptDetails);

      result.scriptDetails.forEach((scriptDetail) => {
        const script = document.createElement("script");
        script.type = "text/javascript";

        if (scriptDetail.src) {
          script.src = scriptDetail.src;
        } else if (scriptDetail.content) {
          script.textContent = scriptDetail.content;
        }

        document.body.appendChild(script);
      });

      return () => {
        result.scriptDetails.forEach((scriptDetail) => {
          if (scriptDetail.src) {
            const script = document.querySelector(
              `script[src="${scriptDetail.src}"]`
            );
            if (script) {
              script.remove();
            }
          }
        });
      };
    }
  }, [content]);

  if (!isMounted) return null;

  return (
    <article className="news-content mt-4 font-roboto">
      {/* Render the upper content */}
      {/* <div>{parse(upperContent)}</div> */}
      <PostBody content={upperContent} additionalFields={additionalFields} />

      {/* Render the gallery content */}
      <div>{parse(galleryContent)}</div>
    </article>
  );
};

export default PhotoDetail;
