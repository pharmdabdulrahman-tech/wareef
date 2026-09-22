import { createHash, randomUUID } from "node:crypto";
import { Readable } from "node:stream";
import { type File, Storage } from "@google-cloud/storage";
import { getObjectAclPolicy, setObjectAclPolicy } from "./objectAcl";

const REPLIT_SIDECAR_ENDPOINT = "http://127.0.0.1:1106";

const client = new Storage({
  credentials: {
    audience: "replit",
    subject_token_type: "access_token",
    token_url: `${REPLIT_SIDECAR_ENDPOINT}/token`,
    type: "external_account",
    credential_source: {
      url: `${REPLIT_SIDECAR_ENDPOINT}/credential`,
      format: { type: "json", subject_token_field_name: "access_token" },
    },
    universe_domain: "googleapis.com",
  },
  projectId: "",
});

export class ObjectNotFoundError extends Error {}

function ownerToken(userId: string) {
  return createHash("sha256").update(userId).digest("base64url");
}

function parseObjectPath(path: string) {
  const parts = `/${path}`.replace(/^\/+/, "/").split("/");
  if (parts.length < 3) throw new Error("Invalid object path");
  return { bucketName: parts[1], objectName: parts.slice(2).join("/") };
}

function privateDir() {
  const value = process.env.PRIVATE_OBJECT_DIR;
  if (!value) throw new Error("PRIVATE_OBJECT_DIR is not configured");
  return value.replace(/\/$/, "");
}

async function signPut(bucketName: string, objectName: string) {
  const response = await fetch(
    `${REPLIT_SIDECAR_ENDPOINT}/object-storage/signed-object-url`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        bucket_name: bucketName,
        object_name: objectName,
        method: "PUT",
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      }),
      signal: AbortSignal.timeout(30_000),
    },
  );
  if (!response.ok) throw new Error("Failed to sign object upload URL");
  return (await response.json() as { signed_url: string }).signed_url;
}

export class ObjectStorageService {
  isOwnedPath(path: string, userId: string) {
    return path.startsWith(`/objects/uploads/${ownerToken(userId)}/`);
  }

  async createUpload(userId: string) {
    const objectPath = `/objects/uploads/${ownerToken(userId)}/${randomUUID()}`;
    const fullPath = `${privateDir()}/${objectPath.slice("/objects/".length)}`;
    const { bucketName, objectName } = parseObjectPath(fullPath);
    return { uploadURL: await signPut(bucketName, objectName), objectPath };
  }

  async getFile(objectPath: string) {
    if (!objectPath.startsWith("/objects/uploads/")) {
      throw new ObjectNotFoundError();
    }
    const fullPath = `${privateDir()}/${objectPath.slice("/objects/".length)}`;
    const { bucketName, objectName } = parseObjectPath(fullPath);
    const file = client.bucket(bucketName).file(objectName);
    const [exists] = await file.exists();
    if (!exists) throw new ObjectNotFoundError();
    return file;
  }

  async claimForOwner(objectPath: string, userId: string) {
    if (!this.isOwnedPath(objectPath, userId)) {
      throw new Error("Photo path is not owned by the customer");
    }
    const file = await this.getFile(objectPath);
    const [metadata] = await file.getMetadata();
    const allowedImageTypes = new Set([
      "image/jpeg",
      "image/png",
      "image/webp",
      "image/heic",
    ]);
    const size = Number(metadata.size);
    if (
      !allowedImageTypes.has(String(metadata.contentType)) ||
      !Number.isFinite(size) ||
      size < 1 ||
      size > 10 * 1024 * 1024
    ) {
      throw new Error("Invalid photo object");
    }
    const acl = await getObjectAclPolicy(file);
    if (acl && acl.owner !== userId) {
      throw new Error("Photo path is not owned by the customer");
    }
    await setObjectAclPolicy(file, { owner: userId, visibility: "private" });
  }

  async isClaimedBy(objectPath: string, userId: string) {
    const file = await this.getFile(objectPath);
    const acl = await getObjectAclPolicy(file);
    return acl?.owner === userId && acl.visibility === "private";
  }

  async download(file: File) {
    const [metadata] = await file.getMetadata();
    return {
      contentType: String(metadata.contentType || "application/octet-stream"),
      size: metadata.size ? String(metadata.size) : undefined,
      stream: file.createReadStream() as Readable,
    };
  }
}