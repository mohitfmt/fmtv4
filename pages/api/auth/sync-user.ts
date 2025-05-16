import { prisma } from "@/lib/prisma";
import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  try {
    const userData = req.body;

    if (!userData.email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Find user by email and update or create
    const user = await prisma.loggedUser.upsert({
      where: {
        email: userData.email,
      },
      update: {
        name: userData.name,
        picture: userData.picture,
        firstName: userData.given_name,
        lastName: userData.family_name,
        emailVerified: userData.email_verified,
        lastLogin: new Date(),
      },
      create: {
        email: userData.email,
        name: userData.name,
        picture: userData.picture,
        firstName: userData.given_name,
        lastName: userData.family_name,
        emailVerified: userData.email_verified,
      },
    });

    return res.status(200).json(user);
  } catch (error) {
    console.error("Error syncing user:", error);
    return res.status(500).json({
      message: "Error syncing user data",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  } finally {
    await prisma.$disconnect();
  }
}
