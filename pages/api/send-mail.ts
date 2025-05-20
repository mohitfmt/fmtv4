import type { NextApiRequest, NextApiResponse } from "next";
import nodemailer from "nodemailer";
import nodemailerSendgrid from "nodemailer-sendgrid";
import { apiErrorResponse, withTimeout } from "@/lib/utils"; // assume this is your shared error helper

const CONTEXT = "/api/contact-us";

// Configure Nodemailer with SendGrid
const transporter = nodemailer.createTransport(
  nodemailerSendgrid({
    apiKey: process.env.SENDGRID_API_KEY!,
  })
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Set security headers
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");

  // Method check
  if (req.method !== "POST") {
    return apiErrorResponse({
      res,
      status: 405,
      context: CONTEXT,
      message: "Method Not Allowed. Use POST.",
    });
  }

  const { name, email, subject, message } = req.body;

  // Basic validation
  if (
    !name ||
    !email ||
    !subject ||
    !message ||
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof subject !== "string" ||
    typeof message !== "string"
  ) {
    return apiErrorResponse({
      res,
      status: 400,
      context: CONTEXT,
      message: "All fields must be non-empty strings.",
    });
  }

  // Email format check
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return apiErrorResponse({
      res,
      status: 400,
      context: CONTEXT,
      message: "Invalid email format.",
    });
  }

  try {
    await withTimeout(
      transporter.sendMail({
        from: `contact-us@freemalaysiatoday.com`,
        to: process.env?.CONTACT_US_RECIPIENT,
        subject,
        text: `
          name: ${name}
          email: ${email}
          message: ${message}
        `,
      }),
      5000 // 5-second timeout
    );

    return res.status(200).json({ message: "Email sent successfully" });
  } catch (error) {
    return apiErrorResponse({
      res,
      status: 500,
      context: CONTEXT,
      message: "Internal Server Error while sending email.",
      error,
    });
  }
}
