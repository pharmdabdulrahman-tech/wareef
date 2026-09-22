import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import {
  GetCurrentUserResponse,
  GetSecuritySummaryResponse,
  UpdateCurrentUserBody,
  UpdateCurrentUserResponse,
} from "@workspace/api-zod";
import { db, usersTable, type User } from "@workspace/db";
import { requireAuth } from "../middleware/requireAuth";
import { getOrCreateCurrentUser } from "../lib/currentUser";

const router: IRouter = Router();

function onboardingComplete(user: Pick<User, "displayName" | "phone" | "city">) {
  return user.displayName.trim().length >= 2 && Boolean(user.phone?.trim()) && Boolean(user.city?.trim());
}

function output(user: User) {
  return {
    ...user,
    onboardingComplete: onboardingComplete(user),
  };
}

router.get("/me", requireAuth, async (req, res, next) => {
  try {
    const user = await getOrCreateCurrentUser(req);
    res.json(GetCurrentUserResponse.parse(output(user)));
  } catch (error) {
    next(error);
  }
});

router.patch("/me", requireAuth, async (req, res, next) => {
  try {
    const changes = UpdateCurrentUserBody.parse(req.body);
    const current = await getOrCreateCurrentUser(req);
    const profile = { ...current, ...changes };
    const [updated] = await db
      .update(usersTable)
      .set({
        ...changes,
        onboardingComplete: onboardingComplete(profile),
        updatedAt: new Date(),
      })
      .where(eq(usersTable.id, current.id))
      .returning();
    const result = updated ?? current;
    res.json(UpdateCurrentUserResponse.parse(output(result)));
  } catch (error) {
    if (error instanceof Error && error.name === "ZodError") {
      res.status(400).json({ error: "Invalid profile information" });
      return;
    }
    next(error);
  }
});

router.get("/me/security-summary", requireAuth, async (req, res, next) => {
  try {
    const user = await getOrCreateCurrentUser(req);
    res.json(
      GetSecuritySummaryResponse.parse({
        role: user.role,
        roleAssignedByServer: true,
        accountDataIsPrivate: true,
        explanation:
          "Your role is assigned by Wareef and cannot be changed through the account API. Your account data is private to your signed-in session.",
      }),
    );
  } catch (error) {
    next(error);
  }
});

export default router;