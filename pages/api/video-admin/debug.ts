// pages/api/video-admin/debug.ts - Comprehensive diagnostics
import type { NextApiRequest, NextApiResponse } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/pages/api/auth/[...nextauth]";
import { getToken } from "next-auth/jwt";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const results: any = {
    timestamp: new Date().toISOString(),
    environment: {},
    cookies: {},
    session: {},
    token: {},
    nextauth: {},
    diagnosis: [],
  };

  // 1. Environment Variables Check
  results.environment = {
    NODE_ENV: process.env.NODE_ENV || "not-set",
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ? "✅ SET" : "❌ MISSING",
    NEXTAUTH_URL_value: process.env.NEXTAUTH_URL || "undefined",
    AUTH_URL: process.env.AUTH_URL ? "✅ SET" : "❌ MISSING",
    NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET
      ? "✅ SET (length: " + process.env.NEXTAUTH_SECRET.length + ")"
      : "❌ MISSING",
    AUTH_SECRET: process.env.AUTH_SECRET
      ? "✅ SET (length: " + (process.env.AUTH_SECRET?.length || 0) + ")"
      : "❌ MISSING",
    GOOGLE_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID
      ? "✅ SET"
      : "❌ MISSING",
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET
      ? "✅ SET"
      : "❌ MISSING",
  };

  // 2. Cookies Present
  const allCookies = Object.keys(req.cookies);
  results.cookies = {
    all_cookies: allCookies,
    has_standard_session: allCookies.includes("next-auth.session-token"),
    has_secure_session: allCookies.includes("__Secure-next-auth.session-token"),
    has_callback_url:
      allCookies.includes("next-auth.callback-url") ||
      allCookies.includes("__Secure-next-auth.callback-url"),
    has_csrf_token:
      allCookies.includes("next-auth.csrf-token") ||
      allCookies.includes("__Host-next-auth.csrf-token"),
    cookie_values: {
      standard_session: req.cookies["next-auth.session-token"]
        ? "present (length: " +
          req.cookies["next-auth.session-token"].length +
          ")"
        : "missing",
      secure_session: req.cookies["__Secure-next-auth.session-token"]
        ? "present (length: " +
          req.cookies["__Secure-next-auth.session-token"].length +
          ")"
        : "missing",
    },
  };

  // 3. Try to get session
  try {
    const session = await getServerSession(req, res, authOptions);
    results.session = {
      status: session ? "✅ FOUND" : "❌ NOT FOUND",
      user_email: session?.user?.email || "none",
      user_name: session?.user?.name || "none",
      expires: session?.expires || "none",
    };
  } catch (error) {
    results.session = {
      status: "❌ ERROR",
      error: error instanceof Error ? error.message : "unknown error",
    };
  }

  // 4. Try to get token with different secret combinations
  const tokenTests = [];

  // Test 1: Default (AUTH_SECRET || NEXTAUTH_SECRET)
  try {
    const token1 = await getToken({
      req,
      secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET,
    });
    tokenTests.push({
      test: "AUTH_SECRET || NEXTAUTH_SECRET",
      result: token1 ? "✅ SUCCESS" : "❌ NULL",
      email: token1?.email || "none",
    });
  } catch (e) {
    tokenTests.push({
      test: "AUTH_SECRET || NEXTAUTH_SECRET",
      result: "❌ ERROR",
      error: e instanceof Error ? e.message : "unknown",
    });
  }

  // Test 2: Only NEXTAUTH_SECRET
  if (process.env.NEXTAUTH_SECRET) {
    try {
      const token2 = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
      });
      tokenTests.push({
        test: "NEXTAUTH_SECRET only",
        result: token2 ? "✅ SUCCESS" : "❌ NULL",
        email: token2?.email || "none",
      });
    } catch (e) {
      tokenTests.push({
        test: "NEXTAUTH_SECRET only",
        result: "❌ ERROR",
        error: e instanceof Error ? e.message : "unknown",
      });
    }
  }

  // Test 3: Only AUTH_SECRET
  if (process.env.AUTH_SECRET) {
    try {
      const token3 = await getToken({
        req,
        secret: process.env.AUTH_SECRET,
      });
      tokenTests.push({
        test: "AUTH_SECRET only",
        result: token3 ? "✅ SUCCESS" : "❌ NULL",
        email: token3?.email || "none",
      });
    } catch (e) {
      tokenTests.push({
        test: "AUTH_SECRET only",
        result: "❌ ERROR",
        error: e instanceof Error ? e.message : "unknown",
      });
    }
  }

  results.token = {
    tests: tokenTests,
  };

  // 5. NextAuth Configuration Check
  results.nextauth = {
    session_strategy: authOptions.session?.strategy || "not-set",
    has_google_provider:
      authOptions.providers?.some((p) => p.id === "google") || false,
    has_google_onetap:
      authOptions.providers?.some((p) => p.id === "google-onetap") || false,
    pages_signin: authOptions.pages?.signIn || "default",
    pages_error: authOptions.pages?.error || "default",
  };

  // 6. Request Info
  results.request = {
    host: req.headers.host || "none",
    x_forwarded_host: req.headers["x-forwarded-host"] || "none",
    referer: req.headers.referer || "none",
    user_agent: req.headers["user-agent"] || "none",
    protocol:
      req.headers["x-forwarded-proto"] ||
      (req.headers.host?.includes("localhost") ? "http" : "https"),
  };

  // 7. Diagnosis
  const diagnosis = [];

  // Check for NextAuth v4 vs v5 mismatch
  if (!process.env.NEXTAUTH_SECRET && !process.env.AUTH_SECRET) {
    diagnosis.push(
      "🔴 CRITICAL: No auth secret found! Set NEXTAUTH_SECRET (v4) or AUTH_SECRET (v5)"
    );
  } else if (process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
    diagnosis.push("🟡 Using AUTH_SECRET (NextAuth v5 style)");
  } else if (!process.env.AUTH_SECRET && process.env.NEXTAUTH_SECRET) {
    diagnosis.push("🟡 Using NEXTAUTH_SECRET (NextAuth v4 style)");
  } else {
    diagnosis.push(
      "🟡 Both AUTH_SECRET and NEXTAUTH_SECRET are set - ensure they match!"
    );
  }

  // Check NEXTAUTH_URL
  if (!process.env.NEXTAUTH_URL) {
    diagnosis.push("🔴 CRITICAL: NEXTAUTH_URL is not set!");
  } else if (!process.env.NEXTAUTH_URL.startsWith("https://dev-v4")) {
    diagnosis.push(
      `🔴 NEXTAUTH_URL should be https://dev-v4.freemalaysiatoday.com, got: ${process.env.NEXTAUTH_URL}`
    );
  }

  // Check session strategy
  if (authOptions.session?.strategy !== "jwt") {
    diagnosis.push("🔴 Session strategy is not 'jwt' - getToken() won't work!");
  }

  // Check cookies
  if (
    !results.cookies.has_standard_session &&
    !results.cookies.has_secure_session
  ) {
    diagnosis.push(
      "🔴 No session cookie found - user not logged in or cookie not set properly"
    );
  } else if (
    results.cookies.has_secure_session &&
    !results.cookies.has_standard_session
  ) {
    diagnosis.push("✅ Secure session cookie present (production mode)");
  } else if (
    results.cookies.has_standard_session &&
    !results.cookies.has_secure_session
  ) {
    diagnosis.push("✅ Standard session cookie present (development mode)");
  }

  // Check token decoding
  const successfulTokenTest = tokenTests.find((t) =>
    t.result.includes("SUCCESS")
  );
  if (successfulTokenTest) {
    diagnosis.push(`✅ Token can be decoded with: ${successfulTokenTest.test}`);
  } else if (tokenTests.some((t) => t.result.includes("ERROR"))) {
    diagnosis.push("🔴 Token decryption failed - likely wrong secret!");
  } else {
    diagnosis.push("🔴 Token is null - cookie might be invalid or expired");
  }

  results.diagnosis = diagnosis;

  // Set headers for easy viewing in browser network tab
  res.setHeader("X-Debug-Summary", diagnosis.join(" | "));

  res.status(200).json(results);
}
