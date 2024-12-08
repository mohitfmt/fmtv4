import type { NextApiRequest, NextApiResponse } from "next";
import nodemailer from "nodemailer";
import nodemailerSendgrid from "nodemailer-sendgrid";

// Configure Nodemailer to use SendGrid
const transporter = nodemailer.createTransport(
  nodemailerSendgrid({
    apiKey: process.env.SENDGRID_API_KEY!,
  })
);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const { name, email, subject, message } = req.body;

  

  // Validate input fields
  if (!name || !email || !subject || !message) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Send the email using the configured transporter
    await transporter.sendMail({
      from: `contact-us@freemalaysiatoday.com`,
      to: process.env.CONTACT_US_RECIPIENT,
      subject,
      text: `
        name: ${name}
        email: ${email}
        message: ${message}
      `,
    });

    return res.status(200).json({ message: "Email sent successfully" });
  } catch (error) {
    console.error("Error sending email:", error);
    return res.status(500).json({ message: "Failed to send email" });
  }
}
