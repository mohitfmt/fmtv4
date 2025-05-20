import type { NextApiRequest, NextApiResponse } from "next";
import { prisma } from "@/lib/prisma";
import { apiErrorResponse, withTimeout } from "@/lib/utils";

const CONTEXT = "/api/auth/sync-user";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");

  if (req.method !== "POST") {
    return apiErrorResponse({
      res,
      status: 405,
      context: CONTEXT,
      message: "Method not allowed. Use POST.",
    });
  }

  const userData = req.body;

  if (!userData || typeof userData?.email !== "string") {
    return apiErrorResponse({
      res,
      status: 400,
      context: CONTEXT,
      message: "'email' is required in the request body.",
    });
  }

  try {
    const user = await withTimeout(
      prisma.loggedUser.upsert({
        where: { email: userData?.email },
        update: {
          name: userData?.name,
          picture: userData?.picture,
          firstName: userData?.given_name,
          lastName: userData?.family_name,
          emailVerified: userData?.email_verified,
          lastLogin: new Date(),
        },
        create: {
          email: userData?.email,
          name: userData?.name,
          picture: userData?.picture,
          firstName: userData?.given_name,
          lastName: userData?.family_name,
          emailVerified: userData?.email_verified,
        },
      }),
      5000 // 5 second timeout
    );

    return res.status(200).json(user);
  } catch (error) {
    return apiErrorResponse({
      res,
      status: 500,
      context: CONTEXT,
      message: "Internal Server Error while syncing user data.",
      error,
    });
  } finally {
    await prisma.$disconnect();
  }
}
