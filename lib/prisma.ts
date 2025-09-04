import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient };

export const prisma = globalForPrisma.prisma || new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

// import { PrismaClient } from "@prisma/client";

// // Singleton pattern for Prisma client
// const globalForPrisma = global as unknown as {
//   prisma: PrismaClient | undefined;
// };

// // Only create if MongoDB logging is enabled
// export const prisma =
//   process.env.LOG_TO_MONGODB === "true"
//     ? (globalForPrisma.prisma ??
//       new PrismaClient({
//         log:
//           process.env.NODE_ENV === "development"
//             ? ["error", "warn"]
//             : ["error"],
//       }))
//     : null;

// if (
//   process.env.NODE_ENV !== "production" &&
//   process.env.LOG_TO_MONGODB === "true"
// ) {
//   globalForPrisma.prisma = prisma!;
// }

// // Ensure TTL index exists (call this once on startup)
// export async function ensureTTLIndex() {
//   if (!prisma || process.env.LOG_TO_MONGODB !== "true") return;

//   try {
//     // MongoDB TTL index on timestamp field (7 days)
//     await prisma.$runCommandRaw({
//       createIndexes: "admin_activity_logs",
//       indexes: [
//         {
//           key: { timestamp: 1 },
//           name: "timestamp_ttl",
//           expireAfterSeconds: 604800, // 7 days in seconds
//         },
//       ],
//     });
//     console.log("[Prisma] TTL index ensured on admin_activity_logs");
//   } catch (error) {
//     console.error("[Prisma] Failed to create TTL index:", error);
//   }
// }
