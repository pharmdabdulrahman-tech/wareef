import { getAuth } from "@clerk/express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";

function identityDisplayName(req: Parameters<typeof getAuth>[0]): string {
  const claims = getAuth(req).sessionClaims as Record<string, unknown> | undefined;
  const name = claims?.name ?? claims?.fullName;
  return typeof name === "string" && name.trim().length >= 2
    ? name.trim().slice(0, 100)
    : "Wareef customer";
}

export function initialCustomerValues(userId: string, displayName: string) {
  return { id: userId, displayName };
}

export async function getOrCreateCurrentUser(
  req: Parameters<typeof getAuth>[0] & { userId: string },
) {
  const existing = await db.query.usersTable.findFirst({
    where: eq(usersTable.id, req.userId),
  });
  if (existing) return existing;

  const [created] = await db
    .insert(usersTable)
    .values(initialCustomerValues(req.userId, identityDisplayName(req)))
    .onConflictDoNothing({ target: usersTable.id })
    .returning();
  return (
    created ??
    (await db.query.usersTable.findFirst({
      where: eq(usersTable.id, req.userId),
    }))!
  );
}