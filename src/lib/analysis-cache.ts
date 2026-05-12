import crypto from "crypto";
import fs from "fs";
import path from "path";

interface CachedAnalysis {
  result: unknown;
  documentsHash: string;
  analyzedAt: Date;
}

const CACHE_FILE = path.resolve("src/storage/analysis-cache.json");

type SerializedCache = Record<string, { result: unknown; documentsHash: string; analyzedAt: string }>;

function loadFromDisk(): Map<string, CachedAnalysis> {
  try {
    const raw = fs.readFileSync(CACHE_FILE, "utf-8");
    const parsed = JSON.parse(raw) as SerializedCache;
    const map = new Map<string, CachedAnalysis>();
    for (const [key, val] of Object.entries(parsed)) {
      map.set(key, { ...val, analyzedAt: new Date(val.analyzedAt) });
    }
    return map;
  } catch {
    return new Map();
  }
}

function saveToDisk(cache: Map<string, CachedAnalysis>) {
  const obj: SerializedCache = {};
  for (const [key, val] of cache.entries()) {
    obj[key] = { ...val, analyzedAt: val.analyzedAt.toISOString() };
  }
  fs.mkdirSync(path.dirname(CACHE_FILE), { recursive: true });
  fs.writeFileSync(CACHE_FILE, JSON.stringify(obj, null, 2), "utf-8");
}

const cache = loadFromDisk();

export function getCached(orderId: string): CachedAnalysis | null {
  return cache.get(orderId) ?? null;
}

export function setCached(orderId: string, result: unknown, documentsHash: string) {
  cache.set(orderId, { result, documentsHash, analyzedAt: new Date() });
  saveToDisk(cache);
}

export function clearCached(orderId: string) {
  cache.delete(orderId);
  saveToDisk(cache);
}

export function hashDocuments(
  documents: Array<{ id: string; status?: string; fixedAt?: string; generatedByAI?: boolean }>,
): string {
  const input = documents
    .map((d) => `${d.id}:${d.status ?? ""}:${d.fixedAt ?? ""}:${d.generatedByAI ?? false}`)
    .sort()
    .join("|");
  return crypto.createHash("sha1").update(input).digest("hex");
}
