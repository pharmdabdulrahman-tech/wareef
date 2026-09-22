import { getAuth } from "@clerk/express";
import type { RequestHandler } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable, type User } from "@workspace/db";

declare global {
  namespace Express {
    interface Request {
      userId: string;
    }
  }
}

export function requireAuthWith(
  getUserId: (
    request: Parameters<RequestHandler>[0],
  ) => string | null | undefined,
): RequestHandler {
  return (req, res, next) => {
    const userId = getUserId(req);

    if (!userId) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    req.userId = String(userId);
    next();
  };
}

export const requireAuth = requireAuthWith((req) => getAuth(req)?.userId);

export function requireRoleWith(
  getUserRole: (userId: string) => Promise<User["role"] | null>,
  ...roles: User["role"][]
): RequestHandler[] {
  return [
    requireAuth,
    async (req, res, next) => {
      try {
        const role = await getUserRole(req.userId);
        if (!role || !roles.includes(role)) {
          res.status(403).json({ error: "Forbidden" });
          return;
        }
        next();
      } catch (error) {
        next(error);
      }
    },
  ];
}

export function requireRole(...roles: User["role"][]): RequestHandler[] {
  return requireRoleWith(async (userId) => {
    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, userId),
      columns: { role: true },
    });
    return user?.role ?? null;
  }, ...roles);
}