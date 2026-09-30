import "server-only";

import { randomUUID } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { GetObjectCommand, PutObjectCommand, S3Client, type GetObjectCommandOutput } from "@aws-sdk/client-s3";

const localStorageRoot = path.join(process.cwd(), "storage", "employee-documents");

type StorageMode = "local" | "s3";

function cleanPrefix(prefix: string | undefined): string {
  if (!prefix) return "employee-documents";
  return prefix.replace(/^\/+|\/+$/g, "") || "employee-documents";
}

function getStorageMode(): StorageMode {
  const configuredMode = process.env.DOCUMENT_STORAGE_PROVIDER?.toLowerCase();
  if (configuredMode === "local" || configuredMode === "s3") return configuredMode;
  return process.env.S3_DOCUMENT_BUCKET || process.env.AWS_S3_DOCUMENT_BUCKET ? "s3" : "local";
}

function getS3Config() {
  const bucket = process.env.S3_DOCUMENT_BUCKET || process.env.AWS_S3_DOCUMENT_BUCKET;
  const region = process.env.AWS_REGION || process.env.AWS_DEFAULT_REGION;
  const prefix = cleanPrefix(process.env.S3_DOCUMENT_PREFIX);
  const kmsKeyId = process.env.S3_DOCUMENT_KMS_KEY_ID || process.env.AWS_KMS_KEY_ID;

  if (!bucket || !region) {
    throw new Error("S3 document storage requires S3_DOCUMENT_BUCKET and AWS_REGION.");
  }

  return { bucket, region, prefix, kmsKeyId };
}

function createS3Client(): S3Client {
  return new S3Client({ region: getS3Config().region });
}

function cleanKeySegment(value: string): string {
  const cleaned = value
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned.slice(0, 80) || "unknown";
}

function dateSegments(): string[] {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  return [String(year), month, day];
}

function s3StorageKey(fileName: string, keySegments: string[] = []): string {
  const segments = [
    getS3Config().prefix,
    ...keySegments.map(cleanKeySegment),
    ...dateSegments(),
    `${randomUUID()}-${fileName}`,
  ];
  return segments.join("/");
}

function localStorageKey(fileName: string, keySegments: string[] = []): string {
  const segments = [...keySegments.map(cleanKeySegment), ...dateSegments(), `${randomUUID()}-${fileName}`];
  return segments.join("/");
}

async function bodyToBuffer(body: GetObjectCommandOutput["Body"]): Promise<Buffer> {
  if (!body) throw new Error("S3 document body was empty.");

  const transformable = body as { transformToByteArray?: () => Promise<Uint8Array> };
  if (typeof transformable.transformToByteArray === "function") {
    return Buffer.from(await transformable.transformToByteArray());
  }

  if (body instanceof Uint8Array) return Buffer.from(body);

  if (body instanceof Blob) {
    return Buffer.from(await body.arrayBuffer());
  }

  const stream = body as NodeJS.ReadableStream;
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on("data", (chunk: Buffer | Uint8Array | string) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    stream.once("end", () => resolve(Buffer.concat(chunks)));
    stream.once("error", reject);
  });
}

export function getDocumentStorageMode(): StorageMode {
  return getStorageMode();
}

export async function putDocumentObject(input: {
  bytes: Buffer;
  fileName: string;
  keySegments?: string[];
  mimeType: string;
}): Promise<{ key: string }> {
  if (getStorageMode() === "local") {
    const key = localStorageKey(input.fileName, input.keySegments);
    await mkdir(path.dirname(path.join(localStorageRoot, key)), { recursive: true });
    await writeFile(path.join(localStorageRoot, key), input.bytes);
    return { key };
  }

  const config = getS3Config();
  const key = s3StorageKey(input.fileName, input.keySegments);
  await createS3Client().send(
    new PutObjectCommand({
      Bucket: config.bucket,
      Key: key,
      Body: input.bytes,
      ContentType: input.mimeType,
      ServerSideEncryption: config.kmsKeyId ? "aws:kms" : "AES256",
      SSEKMSKeyId: config.kmsKeyId || undefined,
      Metadata: {
        originalFileName: input.fileName,
        app: "kadris-hr",
      },
    }),
  );

  return { key };
}

export async function getDocumentObject(key: string): Promise<{ bytes: Buffer }> {
  if (getStorageMode() === "local") {
    return { bytes: await readFile(path.join(localStorageRoot, key)) };
  }

  const config = getS3Config();
  const response = await createS3Client().send(
    new GetObjectCommand({
      Bucket: config.bucket,
      Key: key,
    }),
  );

  return { bytes: await bodyToBuffer(response.Body) };
}
