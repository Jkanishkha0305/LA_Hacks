import * as dotenv from 'dotenv';
import { generateObject } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { z } from 'zod';

dotenv.config();

const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY,
});

async function fetchStreetView(lat: number, lng: number) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  const url = `https://maps.googleapis.com/maps/api/streetview?size=640x480&location=${lat},${lng}&key=${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Street View HTTP ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function main() {
  const lat = 40.7484; // Empire State Building
  const lng = -73.9857;

  console.log('Fetching Street View image...');
  try {
    const buffer = await fetchStreetView(lat, lng);
    console.log(`Success! Image fetched (${buffer.length} bytes).`);

    console.log('Analyzing image with Gemini...');
    const { object } = await generateObject({
      model: google('gemini-1.5-flash'),
      schema: z.object({
        buildingVisible: z.boolean(),
        description: z.string(),
      }),
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'Describe the building in this image.' },
          { type: 'file', data: buffer, mediaType: 'image/jpeg' },
        ],
      }],
    });

    console.log('Gemini Analysis:', object);
  } catch (err) {
    console.error('Test failed:', err);
  }
}

main();
