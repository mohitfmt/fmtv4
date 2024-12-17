import React from "react";
import parse, {
  HTMLReactParserOptions,
  domToReact,
  Element,
  DOMNode,
} from "html-react-parser";
import Image from "next/image";
import sanitizeHtml from "sanitize-html";

import { YouTubeEmbed } from "@next/third-parties/google";
import AdSlot from "../common/AdSlot";

interface PostBodyProps {
  content: string;
  fullArticleUrl: string;
  additionalFields: {
    categories: { edges: Array<{ node: { name: string } }> };
    tags: { edges: Array<{ node: { name: string } }> };
  };
}

const PostBody: React.FC<PostBodyProps> = ({
  content,
  fullArticleUrl,
  additionalFields,
}) => {
  if (!content) return null;

  // Pre-process content to fix any potential nested anchors
  const preprocessContent = (htmlContent: string): string => {
    return (
      htmlContent
        .replace(/<a[^>]*>(\s*<a[^>]*>.*?<\/a>\s*)<\/a>/g, "$1")
        // Convert www to media for image URLs
        .replace(/https?:\/\/www\.freemalaysiatoday\.com/g, "")
        .replace(/https?:\/\/www\./g, "https://media.")
    );
  };

  const sanitizedContent = sanitizeHtml(preprocessContent(content), {
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags,
      "img",
      "iframe",
      "figure",
      "figcaption",
      "var",
    ],
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      "*": ["class", "id", "style"],
      figure: ["class", "id", "style"],
      img: ["src", "alt", "width", "height", "loading", "class"],
      iframe: ["src", "width", "height", "frameborder", "allowfullscreen"],
      a: ["href", "target", "rel", "class"],
    },
    transformTags: {
      a: (tagName, attribs) => {
        // Handle links at sanitization time
        const href = attribs.href || "#";
        const isExternal =
          !href.includes("freemalaysiatoday.com") && !href.startsWith("/");

        return {
          tagName: "a",
          attribs: {
            ...attribs,
            href: isExternal
              ? href
              : href.replace(/https?:\/\/(www\.)?freemalaysiatoday\.com/g, ""),
            ...(isExternal
              ? { target: "_blank", rel: "noopener noreferrer" }
              : {}),
            class: "text-red-600 hover:underline",
          },
        };
      },
    },
  });

  const options: HTMLReactParserOptions = {
    replace: (domNode) => {
      if (domNode instanceof Element) {
        switch (domNode.name) {
          case "img": {
            return (
              <div className="htmr-img-wrapper">
                <Image
                  src={domNode.attribs.src}
                  alt={domNode.attribs.alt || ""}
                  width={800}
                  height={400}
                  className="htmr-img h-auto w-full"
                  loading="lazy"
                />
              </div>
            );
          }

          case "figure":
            return (
              <figure className={domNode.attribs.class || "mb-6"}>
                {domToReact(domNode.children as DOMNode[], options)}
              </figure>
            );

          case "figcaption":
            return (
              <figcaption className="mt-2 text-center text-sm text-gray-600">
                {domToReact(domNode.children as DOMNode[], options)}
              </figcaption>
            );

          case "iframe": {
            const src = domNode.attribs.src || "";
            if (src.includes("youtube")) {
              const videoId = src.split("/").pop() || "";
              return (
                <div className="aspect-video w-full overflow-hidden rounded-lg">
                  <YouTubeEmbed
                    videoid={videoId}
                    params="controls=1&showinfo=1"
                  />
                </div>
              );
            }
            return null;
          }
        }
      }
    },
  };

  const transformedContent = parse(sanitizedContent, options);

  const adConfigurations = [
    {
      paragraphIndex: 2,
      component: (
        <AdSlot
          key="in-article-midrec"
          sizes={[[300, 250]]}
          id="div-gpt-ad-1661442005178-0"
          name="In_Article_Midrec"
          visibleOnDevices="both"
          targetingParams={{
            pos: "article",
            section: additionalFields.categories.edges.map(
              (category) => category.node.name
            ),
            key: additionalFields.tags.edges.map((tag) => tag.node.name),
          }}
        />
      ),
    },
    {
      paragraphIndex: 4,
      component: (
        <AdSlot
          key="ros-1x1"
          sizes={[[1, 1]]}
          id="div-gpt-ad-1661356464065-0"
          name="ROS_1x1"
          visibleOnDevices="both"
          targetingParams={{
            pos: "article",
            section: additionalFields.categories.edges.map(
              (category) => category.node.name
            ),
            key: additionalFields.tags.edges.map((tag) => tag.node.name),
          }}
        />
      ),
    },
    {
      paragraphIndex: 8,
      component: (
        <AdSlot
          key="ros-mobile-leaderboard-b"
          sizes={[320, 50]}
          id="div-gpt-ad-1661362705442-0"
          name="ROS_Mobile_Leaderboard_b"
          visibleOnDevices="onlyMobile"
          targetingParams={{
            pos: "article",
            section: additionalFields.categories.edges.map(
              (category) => category.node.name
            ),
            key: additionalFields.tags.edges.map((tag) => tag.node.name),
          }}
        />
      ),
    },
    {
      paragraphIndex: 12,
      component: (
        <AdSlot
          key="ros-midrec"
          sizes={[[300, 250]]}
          id="div-gpt-ad-1661333336129-0"
          name="ROS_Midrec"
          visibleOnDevices="onlyMobile"
          targetingParams={{
            pos: "article",
            section: additionalFields.categories.edges.map(
              (category) => category.node.name
            ),
            key: additionalFields.tags.edges.map((tag) => tag.node.name),
          }}
        />
      ),
    },
  ];

  let paragraphCount = 0;
  const contentWithAds = React.Children.toArray(transformedContent).reduce(
    (acc: React.ReactNode[], element, index) => {
      acc.push(element);

      if (
        React.isValidElement(element) &&
        element.type === "p" &&
        (!element.props.children?.[0]?.type ||
          element.props.children?.[0]?.type !== "img")
      ) {
        paragraphCount++;
        const adToInsert = adConfigurations.find(
          (config) => config.paragraphIndex === paragraphCount
        );

        if (adToInsert) {
          acc.push(
            <div
              key={`ad-${paragraphCount}`}
              className="my-4 flex justify-center"
            >
              {adToInsert.component}
            </div>
          );
        }
      }

      return acc;
    },
    []
  );

  return (
    <article className="news-content prose prose-lg max-w-none">
      {contentWithAds}
    </article>
  );
};

export default PostBody;
