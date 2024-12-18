import { NextApiRequest, NextApiResponse } from "next";

// Types for request body
type RevalidateBody = {
  postId?: number;
  postSlug?: string;
  type?: "post" | "page" | "category";
  path?: string;
};

async function revalidatePost(res: NextApiResponse, slug: string) {
  try {
    await res.revalidate(`/category/${slug}`);
    console.log(`[Revalidate] Article ${slug} revalidated successfully`);

    await res.revalidate("/");
    console.log("[Revalidate] Homepage revalidated due to article update");

    return true;
  } catch (err) {
    console.error(`[Revalidate] Error revalidating article ${slug}:`, err);
    return false;
  }
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  try {
    const body = req.body as RevalidateBody;

    switch (body.type) {
      case "post":
        if (!body.postSlug) {
          return res.status(400).json({ message: "Post slug is required" });
        }

        const success = await revalidatePost(res, body.postSlug);
        if (!success) {
          return res.status(500).json({ message: "Error revalidating post" });
        }
        break;

      case "category":
        if (!body.path) {
          return res.status(400).json({ message: "Category path is required" });
        }
        await res.revalidate(body.path);
        break;

      default:
        await res.revalidate("/");
    }

    return res.json({
      revalidated: true,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[Revalidate] Error:", err);
    return res.status(500).json({
      message: "Error revalidating",
      error: process.env.NODE_ENV === "development" ? err : undefined,
    });
  }
}
