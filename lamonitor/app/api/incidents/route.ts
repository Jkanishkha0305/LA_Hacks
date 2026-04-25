/**
 * MongoDB Atlas Incident Logger — persists detected safety events.
 *
 * POST /api/incidents   — log a new incident
 * GET  /api/incidents   — retrieve recent incidents (with optional filters)
 *
 * Requires MONGODB_URI in .env.local
 * Free tier: https://www.mongodb.com/atlas (M0 free forever)
 *
 * Schema:
 * {
 *   cameraId, lat, lng, h3Cell, riskScore, riskTier,
 *   events: [{ timestamp, description, isDangerous }],
 *   detectedAt, source
 * }
 */
import { NextRequest, NextResponse } from "next/server";

const MONGODB_URI = process.env.MONGODB_URI ?? "";
const DB_NAME = "lamonitor";
const COLLECTION = "incidents";

// Lightweight MongoDB driver — only imported if URI is configured.
// Falls back to in-memory store for demo when Atlas isn't set up.
let _collection: any = null;
const memoryStore: any[] = [];

async function getCollection() {
  if (_collection) return _collection;

  if (!MONGODB_URI) {
    // In-memory fallback for demo
    return null;
  }

  try {
    const { MongoClient } = await import("mongodb");
    const client = new MongoClient(MONGODB_URI);
    await client.connect();
    const db = client.db(DB_NAME);
    _collection = db.collection(COLLECTION);

    // Create indexes for common queries
    await _collection.createIndex({ detectedAt: -1 });
    await _collection.createIndex({ cameraId: 1, detectedAt: -1 });
    await _collection.createIndex({ riskTier: 1 });
    await _collection.createIndex({ "location.coordinates": "2dsphere" });

    return _collection;
  } catch (err) {
    console.warn("MongoDB connection failed, using in-memory store:", err);
    return null;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      cameraId,
      lat,
      lng,
      h3Cell,
      riskScore,
      riskTier,
      events,
    } = body;

    if (!cameraId || !events) {
      return NextResponse.json(
        { error: "cameraId and events are required" },
        { status: 400 }
      );
    }

    const doc = {
      cameraId,
      location:
        lat && lng
          ? { type: "Point", coordinates: [lng, lat] }
          : null,
      h3Cell: h3Cell ?? null,
      riskScore: riskScore ?? null,
      riskTier: riskTier ?? null,
      events: Array.isArray(events) ? events : [],
      dangerousCount: Array.isArray(events)
        ? events.filter((e: any) => e.isDangerous).length
        : 0,
      detectedAt: new Date().toISOString(),
      source: "lamonitor",
    };

    const col = await getCollection();

    if (col) {
      const result = await col.insertOne(doc);
      return NextResponse.json(
        { ok: true, id: result.insertedId.toString(), store: "atlas" },
        { status: 201 }
      );
    } else {
      // In-memory fallback
      const id = `mem-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      memoryStore.push({ _id: id, ...doc });
      // Keep max 1000 in memory
      if (memoryStore.length > 1000) memoryStore.shift();
      return NextResponse.json(
        { ok: true, id, store: "memory" },
        { status: 201 }
      );
    }
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message ?? "failed to log incident" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const limit = Math.min(
      parseInt(req.nextUrl.searchParams.get("limit") ?? "50"),
      200
    );
    const cameraId = req.nextUrl.searchParams.get("cameraId");
    const tier = req.nextUrl.searchParams.get("tier");
    const dangerousOnly =
      req.nextUrl.searchParams.get("dangerous") === "true";

    const col = await getCollection();

    if (col) {
      const filter: any = {};
      if (cameraId) filter.cameraId = cameraId;
      if (tier) filter.riskTier = tier;
      if (dangerousOnly) filter.dangerousCount = { $gt: 0 };

      const docs = await col
        .find(filter)
        .sort({ detectedAt: -1 })
        .limit(limit)
        .toArray();

      return NextResponse.json({
        incidents: docs,
        count: docs.length,
        store: "atlas",
      });
    } else {
      // In-memory fallback
      let results = [...memoryStore];
      if (cameraId)
        results = results.filter((d) => d.cameraId === cameraId);
      if (tier) results = results.filter((d) => d.riskTier === tier);
      if (dangerousOnly)
        results = results.filter((d) => d.dangerousCount > 0);

      results.reverse(); // newest first
      results = results.slice(0, limit);

      return NextResponse.json({
        incidents: results,
        count: results.length,
        store: "memory",
        note: "Set MONGODB_URI for persistent Atlas storage",
      });
    }
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message ?? "failed to fetch incidents" },
      { status: 500 }
    );
  }
}
