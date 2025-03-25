// pages/api/decrypt-preview-token.ts
import { NextApiRequest, NextApiResponse } from "next";
import CryptoJS from "crypto-js";
import encHex from "crypto-js/enc-hex";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({ error: "No token provided" });
    }

    // Decrypt the token
    const iv = encHex.parse(process.env.NEXT_PUBLIC_CRYPTO_IV || "");
    const key = process.env.NEXT_PUBLIC_CRYPTO_KEY || "";
    const keyObj = CryptoJS.enc.Utf8.parse(key);

    // Parse Base64 token
    let cipherText;
    try {
      cipherText = CryptoJS.enc.Base64.parse(token);
    } catch (parseError) {
      return res.status(400).json({
        error: "Failed to parse the preview token",
      });
    }

    // Decrypt the token
    let decryptedStr;
    try {
      decryptedStr = CryptoJS.AES.decrypt(
        cipherText.toString(CryptoJS.enc.Utf8),
        keyObj,
        { iv }
      );
    } catch (decryptError) {
      return res.status(400).json({
        error: "Failed to decrypt the preview token",
      });
    }

    // Convert to UTF-8 string
    let plainText;
    try {
      plainText = decryptedStr.toString(CryptoJS.enc.Utf8);

      if (!plainText) {
        throw new Error("Decrypted text is empty");
      }
    } catch (stringError) {
      return res.status(400).json({
        error: "Failed to read the decrypted preview data",
      });
    }

    // Parse the token parts
    const parts = plainText.split("|");

    if (parts.length < 3) {
      return res.status(400).json({
        error: "Invalid token format: not enough parts",
      });
    }

    const [postId, previewFlag, secret] = parts;

    if (!postId) {
      return res.status(400).json({
        error: "No post ID found in token",
      });
    }

    // Verify the secret
    if (secret !== process.env.NEXT_PUBLIC_WORDPRESS_SECRET) {
      return res.status(401).json({
        error: "Security verification failed for preview",
      });
    }

    // Return the decoded information
    return res.status(200).json({
      postId,
      previewFlag,
      isValidToken: true,
    });
  } catch (error) {
    console.error("Token decryption error:", error);
    return res.status(500).json({
      error: "Failed to process preview token",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
