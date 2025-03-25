import { stripHTML } from "../utils";

export const dynamic = "force-dynamic";

export const transformItemToJSON = (item: any) => {
  const contentEncoded = item["content:encoded"] || "";
  const cleanedContent = contentEncoded.replace(/<figure(.*?)<\/figure>/g, "");
  const imageMatch = contentEncoded.match(/src="([^"]+)"/);
  const imageUrl = imageMatch ? imageMatch[1] : null;

  return {
    id: item?.id || item?.link,
    url: item?.link,
    title: item?.title,
    summary: item?.contentSnippet,
    content_html: contentEncoded,
    content_text: stripHTML(cleanedContent),
    date_published: item?.isoDate,
    author: {
      name: item?.creator || "FMT Reporters",
    },

    tags: item?.categories,
    image: imageUrl,
    banner_image: imageUrl,
  };
};
