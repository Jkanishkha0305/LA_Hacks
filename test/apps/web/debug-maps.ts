import * as dotenv from 'dotenv';
dotenv.config();

async function testMapsAPI() {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  const lat = 40.7484;
  const lng = -73.9857;
  
  console.log(`Testing key: ${key?.substring(0, 10)}...`);
  
  // Test Street View
  const svUrl = `https://maps.googleapis.com/maps/api/streetview?size=640x480&location=${lat},${lng}&key=${key}`;
  console.log('\nTesting Street View Static API...');
  const svRes = await fetch(svUrl);
  const svText = await svRes.text();
  console.log(`Status: ${svRes.status}`);
  console.log(`Response body snippet: ${svText.substring(0, 200)}`);

  // Test Static Maps (Satellite)
  const smUrl = `https://maps.googleapis.com/maps/api/staticmap?center=${lat},${lng}&zoom=18&size=640x640&maptype=satellite&key=${key}`;
  console.log('\nTesting Maps Static API (Satellite)...');
  const smRes = await fetch(smUrl);
  console.log(`Status: ${smRes.status}`);
  if (smRes.status !== 200) {
    const smText = await smRes.text();
    console.log(`Response body snippet: ${smText.substring(0, 200)}`);
  } else {
    console.log('Success! Maps Static API is working.');
  }
}

testMapsAPI();
