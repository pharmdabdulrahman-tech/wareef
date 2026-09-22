import { Router, type IRouter, type RequestHandler } from "express";
import {
  RequestUploadUrlBody,
  RequestUploadUrlResponse,
} from "@workspace/api-zod";
import { requireAuth } from "../middleware/requireAuth";
import { and, eq, inArray } from "drizzle-orm";
import { db, ordersTable, providerProfilesTable, usersTable } from "@workspace/db";
import {
  ObjectNotFoundError,
  ObjectStorageService,
} from "../lib/objectStorage";
import { providerPrivateBookingStatuses } from "../lib/bookingAccess";

const router: IRouter = Router();
const storage = new ObjectStorageService();

router.post(
  "/storage/uploads/request-url",
  requireAuth,
  async (req, res) => {
    const parsed = RequestUploadUrlBody.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: "Invalid image metadata" });
      return;
    }
    try {
      const upload = await storage.createUpload(req.userId);
      res.json(RequestUploadUrlResponse.parse(upload));
    } catch (error) {
      req.log.error({ err: error }, "Failed to create private upload URL");
      res.status(500).json({ error: "Failed to create upload URL" });
    }
  },
);

export const privateObjectCachePolicy: RequestHandler = (_req, res, next) => {
  // Authorization can change after cancellation. Never reuse private photo bytes.
  res.setHeader("Cache-Control", "private, no-store");
  next();
};

export const servePrivateObject: RequestHandler = async (req, res) => {
  const raw = req.params.path;
  const path = Array.isArray(raw) ? raw.join("/") : raw;
  const objectPath = `/objects/${path}`;
  let allowed = storage.isOwnedPath(objectPath, req.userId);
  if (!allowed) {
    const assigned = await db
      .select({ booking: ordersTable.booking, customerId: ordersTable.userId })
      .from(ordersTable)
      .innerJoin(
        providerProfilesTable,
        eq(providerProfilesTable.id, ordersTable.providerId),
      )
      .innerJoin(usersTable, eq(usersTable.id, providerProfilesTable.id))
      .where(
        and(
          eq(ordersTable.providerId, req.userId),
          eq(ordersTable.kind, "service"),
          inArray(ordersTable.status, [...providerPrivateBookingStatuses]),
          eq(providerProfilesTable.approved, true),
          eq(providerProfilesTable.status, "approved"),
          eq(usersTable.role, "provider_owner"),
        ),
      );
    const match = assigned.find((row) =>
      row.booking?.photoPaths?.includes(objectPath),
    );
    if (match) {
      allowed = await storage.isClaimedBy(objectPath, match.customerId);
    }
  }
  if (!allowed) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  try {
    const file = await storage.getFile(objectPath);
    const download = await storage.download(file);
    res.setHeader("Content-Type", download.contentType);
    if (download.size) res.setHeader("Content-Length", download.size);
    download.stream.pipe(res);
  } catch (error) {
    if (error instanceof ObjectNotFoundError) {
      res.status(404).json({ error: "Object not found" });
      return;
    }
    req.log.error({ err: error }, "Failed to serve private object");
    res.status(500).json({ error: "Failed to serve object" });
  }
};

router.get(
  "/storage/objects/*path",
  privateObjectCachePolicy,
  requireAuth,
  servePrivateObject,
);

export default router;