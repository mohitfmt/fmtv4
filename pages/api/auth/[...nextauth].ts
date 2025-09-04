import NextAuth, { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { OAuth2Client } from "google-auth-library";
import { adminAuditLog } from "@/lib/logging";
import type { NextApiRequest, NextApiResponse } from "next";

const ALLOWED_EMAIL_DOMAIN =
  process.env.ALLOWED_EMAIL_DOMAIN || "freemalaysiatoday.com";
const ADMIN_ALLOWED_HOST =
  process.env.ADMIN_ALLOWED_HOST || "dev-v4.freemalaysiatoday.com";

// Initialize Google OAuth2 client for One Tap verification
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 7 * 24 * 60 * 60, // 7 days for admin
  },

  providers: [
    // Normal Google OAuth provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",
          access_type: "offline",
          response_type: "code",
          hd: ALLOWED_EMAIL_DOMAIN, // Hint only
        },
      },
    }),

    // Credentials provider for Google One Tap
    CredentialsProvider({
      id: "google-onetap",
      name: "Google One Tap",
      credentials: {
        idToken: { label: "ID Token", type: "text" },
      },
      async authorize(credentials, req) {
        if (!credentials?.idToken) {
          return null;
        }

        try {
          // Verify the ID token
          const ticket = await googleClient.verifyIdToken({
            idToken: credentials.idToken,
            audience: process.env.GOOGLE_CLIENT_ID!,
          });

          const payload = ticket.getPayload();
          if (!payload) {
            return null;
          }

          // Enforce domain restriction
          if (
            !payload.email?.toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)
          ) {
            console.warn(`[One Tap] Domain restricted: ${payload.email}`);
            return null;
          }

          // Return user object
          return {
            id: payload.sub,
            email: payload.email,
            name: payload.name || payload.email,
            image: payload.picture || null,
          };
        } catch (error) {
          console.error("[One Tap] Token verification failed:", error);
          return null;
        }
      },
    }),
  ],

  pages: {
    signIn: "/video-admin",
    error: "/video-admin",
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      // Domain enforcement for normal Google OAuth
      if (account?.provider === "google") {
        if (!user.email?.toLowerCase().endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)) {
          // Return error URL instead of false
          return "/video-admin?error=domain";
        }
      }

      // Log successful sign-in
      if (user.email) {
        await adminAuditLog({
          timestamp: new Date().toISOString(),
          env: process.env.NODE_ENV || "development",
          host: ADMIN_ALLOWED_HOST,
          path: "/api/auth/signin",
          method: "POST",
          userEmail: user.email,
          userId: user.id || "unknown",
          outcome: "sign_in",
        }).catch(console.error);
      }

      return true;
    },

    async redirect({ url, baseUrl }) {
      const redirectBase =
        process.env.NODE_ENV === "development"
          ? baseUrl
          : `https://${ADMIN_ALLOWED_HOST}`;

      try {
        const urlObj = new URL(url, redirectBase);

        // Only allow redirects to admin paths
        if (urlObj.pathname.startsWith("/video-admin")) {
          return `${redirectBase}${urlObj.pathname}${urlObj.search}`;
        }

        // Default to video-admin
        return `${redirectBase}/video-admin`;
      } catch {
        return `${redirectBase}/video-admin`;
      }
    },

    async jwt({ token, user, account }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.name = user.name;
        token.picture = user.image;
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.email = token.email as string;
        if (token.picture) {
          session.user.image = token.picture as string;
        }
      }
      return session;
    },
  },

  events: {
    async signOut(message) {
      // Null-safe handling
      const email = message?.token?.email || message?.session?.user?.email;

      if (
        email &&
        typeof email === "string" &&
        email.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`)
      ) {
        await adminAuditLog({
          timestamp: new Date().toISOString(),
          env: process.env.NODE_ENV || "development",
          host: ADMIN_ALLOWED_HOST,
          path: "/api/auth/signout",
          userEmail: email,
          outcome: "sign_out",
        }).catch(console.error);
      }
    },
  },
};

// NextAuth handler with host gating
export default function handler(req: NextApiRequest, res: NextApiResponse) {
  // Extract host
  const host = (req.headers["x-forwarded-host"] || req.headers.host || "")
    .toString()
    .split(":")[0];

  // In development, allow localhost
  const isAllowedHost =
    process.env.NODE_ENV === "development"
      ? host === "localhost" || host === ADMIN_ALLOWED_HOST
      : host === ADMIN_ALLOWED_HOST;

  // Reject non-staging hosts
  if (!isAllowedHost) {
    console.warn(`[NextAuth] Blocked request from unauthorized host: ${host}`);
    return res.status(404).json({ error: "Not found" });
  }

  return NextAuth(req, res, authOptions);
}
