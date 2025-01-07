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
import Link from "next/link";

interface PostBodyProps {
  content: string;
  fullArticleUrl: string;
  additionalFields: {
    categories: { edges: Array<{ node: { name: string } }> };
    tags: { edges: Array<{ node: { name: string } }> };
  };
}

const processParagraph = (text: string): string => {
  const locationPattern = /^([A-Z\s]+:)\s+/;
  const locationMatch = text.match(locationPattern);
  if (locationMatch) {
    text = text.replace(
      locationPattern,
      `<address class='location-block' itemProp='contentLocation' itemScope itemType='https://schema.org/Place'>
        <span itemProp='name'>${locationMatch[1].trim().slice(0, -1)}</span>:
      </address>`
    );
  }

  const quotePattern = /["""](.*?)["""]/g;
  return text.replace(
    quotePattern,
    (_, quote) => `<blockquote class="quote-block"><q>${quote}</q></blockquote>`
  );
};

const isPlainText = (children: any): boolean =>
  typeof children === "string" ||
  children.every((child: any) => typeof child === "string");

const PostBody: React.FC<PostBodyProps> = ({
  content,
  fullArticleUrl,
  additionalFields,
}) => {
  if (!content) return null;

  const preprocessContent = (htmlContent: string): string => {
    return htmlContent
      .replace(/<a[^>]*>(\s*<a[^>]*>.*?<\/a>\s*)<\/a>/g, "$1")
      .replace(/https?:\/\/www\.freemalaysiatoday\.com/g, "")
      .replace(/https?:\/\/www\./g, "https://media.");
  };

  const sanitizedContent = sanitizeHtml(preprocessContent(content), {
    allowedTags: [
      ...sanitizeHtml.defaults.allowedTags,
      "img",
      "iframe",
      "figure",
      "figcaption",
      "var",
      "address",
      "blockquote",
      "q",
    ],
    allowedAttributes: {
      ...sanitizeHtml.defaults.allowedAttributes,
      "*": ["class", "id", "style", "itemProp", "itemScope", "itemType"],
      figure: ["class", "id", "style"],
      img: ["src", "alt", "width", "height", "loading", "class"],
      iframe: ["src", "width", "height", "frameborder", "allowfullscreen"],
      a: ["href", "target", "rel", "class"],
    },
    transformTags: {
      a: (tagName, attribs) => {
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

  let firstImageProcessed = false;

  const options: HTMLReactParserOptions = {
    replace: (domNode) => {
      if (domNode instanceof Element) {
        switch (domNode.name) {
          case "p": {
            const children = domNode.children || [];
            if (isPlainText(children)) {
              const textContent = domToReact(children as DOMNode[]);
              const processedText = processParagraph(String(textContent));

              return (
                <p
                  className="py-1.5 mb-4 text-lg"
                  dangerouslySetInnerHTML={{ __html: processedText }}
                />
              );
            }

            const containsImage = children.some(
              (child: any) => child.name === "img" || child.attribs?.src
            );
            return containsImage ? (
              <div>{domToReact(children as DOMNode[], options)}</div>
            ) : (
              <p className="py-1.5 mb-4 text-lg">
                {domToReact(children as DOMNode[], options)}
              </p>
            );
          }

          case "img": {
            const maxWidth = 912;
            const aspectRatio =
              Number(domNode.attribs.width) / Number(domNode.attribs.height);
            const calculatedHeight = Math.round(maxWidth / aspectRatio);
            const isFloatingLeft = domNode.attribs.class?.includes("alignleft");
            const isFloatingRight =
              domNode.attribs.class?.includes("alignright");

            if (isFloatingLeft || isFloatingRight) {
              return (
                <Image
                  src={domNode.attribs.src}
                  alt={domNode.attribs.alt || ""}
                  width={Number(domNode.attribs.width) || 200}
                  height={Number(domNode.attribs.height) || 200}
                  className={`${isFloatingLeft ? "alignleft" : "alignright"} ${
                    Number(domNode.attribs.height) < 199 && isFloatingLeft
                      ? "mt-4"
                      : ""
                  }`}
                  loading="lazy"
                />
              );
            }

            const currentImageProcessed = firstImageProcessed;
            firstImageProcessed = true;

            return (
              <div
                className="htmr-img-wrapper"
                itemProp="image"
                itemType="https://schema.org/ImageObject"
                itemScope
              >
                <meta content={domNode.attribs.src} itemProp="url" />
                <meta content={domNode.attribs.width} itemProp="width" />
                <meta content={domNode.attribs.height} itemProp="height" />
                <Image
                  src={domNode.attribs.src}
                  alt={domNode.attribs.alt || ""}
                  width={maxWidth}
                  height={calculatedHeight}
                  className="htmr-img h-auto"
                  loading={currentImageProcessed ? "lazy" : "eager"}
                  priority={!currentImageProcessed}
                  sizes="(max-width: 440px) 200px, (max-width: 640px) 400px, (max-width: 768px) 800px, 912px"
                />
              </div>
            );
          }

          case "figure":
            const imageChild = domNode.children.find(
              (child): child is Element =>
                (child as Element).attribs !== undefined
            );

            const isFloatingLeft = domNode.attribs.class?.includes("alignleft");
            const isFloatingRight =
              domNode.attribs.class?.includes("alignright");

            if (isFloatingLeft || isFloatingRight) {
              return (
                <figure
                  style={{
                    padding: isFloatingLeft ? "12px 12px 0 0" : "12px 0 0 12px",
                    width: imageChild?.attribs?.width
                      ? `${imageChild.attribs.width}px`
                      : "auto",
                  }}
                  className={isFloatingLeft ? "alignleft" : "alignright"}
                >
                  {domToReact(domNode.children as DOMNode[], options)}
                </figure>
              );
            }
            return (
              <figure className="mb-6">
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

          case "a": {
            const href = domNode.attribs.href;
            if (href?.includes("freemalaysiatoday.com")) {
              const cleanHref =
                href.replace(/https:\/\/(www\.)?freemalaysiatoday\.com/g, "") ||
                "/";
              return (
                <Link className="text-red-600" href={cleanHref}>
                  {domToReact(domNode.children as DOMNode[], options)}
                </Link>
              );
            }
            return (
              <a
                className="text-red-600"
                href={href}
                target={domNode.attribs.target}
                rel={domNode.attribs.rel}
              >
                {domToReact(domNode.children as DOMNode[], options)}
              </a>
            );
          }

          case "ul":
            return (
              <ul className="article-list">
                {domToReact(domNode.children as DOMNode[], options)}
              </ul>
            );

          case "ol":
            return (
              <ol className="article-list-ol">
                {domToReact(domNode.children as DOMNode[], options)}
              </ol>
            );

          case "li":
            return (
              <li className="article-list-li">
                {domToReact(domNode.children as DOMNode[], options)}
              </li>
            );
        }
      }
    },
  };

  const transformedContent = parse(sanitizedContent, options);

  const adConfigurations = [
    {
      paragraphIndex: 1,
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
