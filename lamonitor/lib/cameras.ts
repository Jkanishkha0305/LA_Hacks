import { Buffer } from "buffer"

// poi-brain backend provides the camera catalog (Caltrans D7)
const POI_BRAIN_URL = process.env.POI_BRAIN_URL ?? process.env.NEXT_PUBLIC_POI_BRAIN_URL ?? "http://localhost:8080"

export interface CaltransCamera {
  id: string
  name: string
  area?: string | null
  latitude: number | null
  longitude: number | null
  imageUrl: string
}

interface RawBrainCamera {
  id?: string
  name?: string
  location?: string
  address?: string
  neighborhood?: string
  latLng?: [number, number]
  snapshotUrl?: string
  online?: boolean
}

function normalizeCamera(raw: RawBrainCamera): CaltransCamera | null {
  if (!raw?.id) return null

  const name = raw.name ?? raw.location ?? "Unnamed Camera"
  const imageUrl = raw.snapshotUrl ?? ""

  return {
    id: raw.id,
    name,
    area: raw.neighborhood ?? raw.location ?? null,
    latitude: raw.latLng ? raw.latLng[0] : null,
    longitude: raw.latLng ? raw.latLng[1] : null,
    imageUrl,
  }
}

async function fetchJson<T>(input: string): Promise<T> {
  const response = await fetch(input, {
    cache: "no-store",
    next: { revalidate: 0 },
    headers: {
      Accept: "application/json",
    },
  })

  if (!response.ok) {
    throw new Error(`Camera API request failed: ${response.status} ${response.statusText}`)
  }

  return (await response.json()) as T
}

export async function fetchCaltransCameras(limit = 0): Promise<CaltransCamera[]> {
  const payload = await fetchJson<RawBrainCamera[] | { cameras: RawBrainCamera[] }>(`${POI_BRAIN_URL}/cameras`)
  const rawList = Array.isArray(payload) ? payload : payload.cameras ?? []
  const normalized = rawList
    .map(normalizeCamera)
    .filter((camera): camera is CaltransCamera => Boolean(camera))

  if (typeof limit === "number" && limit > 0) {
    return normalized.slice(0, limit)
  }

  return normalized
}

export async function fetchCaltransFrame(cameraId: string): Promise<{ base64Image: string; contentType: string }> {
  if (!cameraId) {
    throw new Error("cameraId is required to fetch camera frame")
  }

  // Fetch single camera from poi-brain instead of the full catalog
  const cam = await fetchJson<RawBrainCamera>(`${POI_BRAIN_URL}/cameras/${encodeURIComponent(cameraId)}`)
  const snapshotUrl = cam?.snapshotUrl
  if (!snapshotUrl) {
    throw new Error(`Camera ${cameraId} not found or has no snapshot URL`)
  }

  const bustUrl = `${snapshotUrl}${snapshotUrl.includes("?") ? "&" : "?"}ts=${Date.now()}`
  const response = await fetch(bustUrl, {
    cache: "no-store",
    next: { revalidate: 0 },
  })

  if (!response.ok) {
    throw new Error(`Failed to fetch camera frame for ${cameraId}: ${response.status}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  const contentType = response.headers.get("content-type") ?? "image/jpeg"
  const base64Image = Buffer.from(arrayBuffer).toString("base64")

  return { base64Image, contentType }
}
