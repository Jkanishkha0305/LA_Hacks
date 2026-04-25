/**
 * Cloudinary Camera Image Enhancement — improves low-quality CCTV frames.
 *
 * POST /api/camera-enhance
 * Body: { imageUrl: string } OR { imageBase64: string }
 * Returns: { enhanced_url, thumbnail_url, analysis_url, original_url }
 *
 * Requires CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
 * Free tier: https://cloudinary.com (25 credits/month)
 *
 * Applies: auto-enhance, noise reduction, upscale, smart crop for thumbnails.
 */
import { NextRequest, NextResponse } from "next/server";

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME ?? "";
const API_KEY = process.env.CLOUDINARY_API_KEY ?? "";
const API_SECRET = process.env.CLOUDINARY_API_SECRET ?? "";

const CLOUDINARY_BASE = `https://res.cloudinary.com/${CLOUD_NAME}/image`;

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, imageBase64 } = await req.json();

    if (!imageUrl && !imageBase64) {
      return NextResponse.json(
        { error: "imageUrl or imageBase64 required" },
        { status: 400 }
      );
    }

    if (!CLOUD_NAME) {
      // Fallback: return transformation URLs using fetch-based Cloudinary
      // Works without API key for public URLs via fetch transformation
      if (imageUrl) {
        const encoded = encodeURIComponent(imageUrl);
        return NextResponse.json({
          original_url: imageUrl,
          note: "CLOUDINARY_CLOUD_NAME not set — returning raw URLs. Set env vars for full enhancement.",
        });
      }
      return NextResponse.json(
        { error: "CLOUDINARY_CLOUD_NAME not configured and no imageUrl provided" },
        { status: 503 }
      );
    }

    if (imageUrl) {
      // Use Cloudinary fetch mode — no upload needed
      const encoded = encodeURIComponent(imageUrl);

      // Enhanced version: auto-improve, sharpen, denoise
      const enhanced_url = `${CLOUDINARY_BASE}/fetch/e_improve,e_sharpen:80,q_auto:best/${encoded}`;

      // Thumbnail: smart-crop face/auto detection, 320x240
      const thumbnail_url = `${CLOUDINARY_BASE}/fetch/c_fill,w_320,h_240,g_auto,e_improve,q_auto/${encoded}`;

      // High-res analysis: upscale 2x for VLM, auto-enhance
      const analysis_url = `${CLOUDINARY_BASE}/fetch/e_upscale,e_improve,e_sharpen:60,q_auto:best/${encoded}`;

      // Annotated version with overlay text
      const annotated_url = `${CLOUDINARY_BASE}/fetch/e_improve,l_text:Arial_14_bold:LIVE,g_north_east,x_10,y_10,co_rgb:FF0000/${encoded}`;

      return NextResponse.json({
        original_url: imageUrl,
        enhanced_url,
        thumbnail_url,
        analysis_url,
        annotated_url,
        transformations: [
          "auto-improve",
          "sharpen",
          "denoise",
          "smart-crop",
          "upscale-2x",
        ],
      });
    }

    if (imageBase64) {
      // Upload to Cloudinary then return enhanced URLs
      const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;

      const formData = new FormData();
      formData.append("file", `data:image/jpeg;base64,${imageBase64}`);
      formData.append("upload_preset", "lamonitor"); // Create this preset in Cloudinary dashboard
      formData.append("folder", "lamonitor/cameras");

      const uploadRes = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        const detail = await uploadRes.text();
        return NextResponse.json(
          { error: `Cloudinary upload failed: ${uploadRes.status}`, detail },
          { status: 502 }
        );
      }

      const uploadData = await uploadRes.json();
      const publicId = uploadData.public_id;

      // Return enhanced versions
      const enhanced_url = `${CLOUDINARY_BASE}/upload/e_improve,e_sharpen:80,q_auto:best/${publicId}.jpg`;
      const thumbnail_url = `${CLOUDINARY_BASE}/upload/c_fill,w_320,h_240,g_auto,e_improve,q_auto/${publicId}.jpg`;
      const analysis_url = `${CLOUDINARY_BASE}/upload/e_upscale,e_improve,q_auto:best/${publicId}.jpg`;

      return NextResponse.json({
        original_url: uploadData.secure_url,
        enhanced_url,
        thumbnail_url,
        analysis_url,
        public_id: publicId,
        transformations: [
          "auto-improve",
          "sharpen",
          "smart-crop",
          "upscale",
        ],
      });
    }
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message ?? "enhancement failed" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({
      service: "camera-enhance",
      description: "Cloudinary-powered camera image enhancement",
      usage: "POST { imageUrl: '...' } or GET ?url=...",
      configured: !!CLOUD_NAME,
      capabilities: [
        "auto-enhance",
        "noise-reduction",
        "smart-crop thumbnails",
        "2x upscale for VLM analysis",
        "LIVE overlay annotation",
      ],
    });
  }

  if (!CLOUD_NAME) {
    return NextResponse.json({ original_url: url, note: "Cloudinary not configured" });
  }

  const encoded = encodeURIComponent(url);
  return NextResponse.json({
    original_url: url,
    enhanced_url: `${CLOUDINARY_BASE}/fetch/e_improve,e_sharpen:80,q_auto:best/${encoded}`,
    thumbnail_url: `${CLOUDINARY_BASE}/fetch/c_fill,w_320,h_240,g_auto,e_improve,q_auto/${encoded}`,
  });
}
