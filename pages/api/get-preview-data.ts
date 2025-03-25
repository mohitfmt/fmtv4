import CryptoJS from "crypto-js";
import encHex from "crypto-js/enc-hex";
import { GET_POST } from "@/lib/gql-queries/get-preview-post";
import { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { p } = req.query;

  if (!p) {
    return res.status(400).json({ error: "Preview token is required" });
  }

  try {
    // Decrypt the token
    const iv = encHex.parse(process.env.NEXT_PUBLIC_CRYPTO_IV || "");
    const key = process.env.NEXT_PUBLIC_CRYPTO_KEY || "";
    const keyObj = CryptoJS.enc.Utf8.parse(key);

    const cipherText = CryptoJS.enc.Base64.parse(Array.isArray(p) ? p[0] : p);
    const decryptedStr = CryptoJS.AES.decrypt(
      cipherText.toString(CryptoJS.enc.Utf8),
      keyObj,
      { iv }
    );

    const plainText = decryptedStr.toString(CryptoJS.enc.Utf8);
    const [postId, previewFlag, secret] = plainText.split("|");

    if (!postId || secret !== process.env.NEXT_PUBLIC_WORDPRESS_SECRET) {
      return res.status(401).json({ error: "Invalid preview token" });
    }

    // Fetch the post data from WordPress
    const wpUrl =
      process.env.WORDPRESS_API_URL ||
      "https://cms.freemalaysiatoday.com/graphql";

    const response = await fetch(wpUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_WP_REFRESH_TOKEN}`,
      },
      body: JSON.stringify({
        query: GET_POST,
        variables: {
          id: postId,
          idType: "DATABASE_ID",
          asPreview: previewFlag === "1",
        },
      }),
    });

    const result = await response.json();

    if (result.errors) {
      console.error("GraphQL errors:", result.errors);
      return res.status(500).json({
        error: "WordPress GraphQL error",
        details: result.errors[0]?.message,
      });
    }

    if (!result.data || !result.data.post) {
      return res.status(404).json({ error: "Post not found" });
    }

    // Return the post data
    return res.status(200).json(result.data);
  } catch (error: any) {
    console.error("Preview error:", error);
    return res.status(500).json({ error: error.message });
  }
}
