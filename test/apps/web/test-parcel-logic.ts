import * as dotenv from 'dotenv';
import path from 'path';

// Load .env
dotenv.config();

const PLUTO_RESOURCE_ID = process.env.PLUTO_RESOURCE_ID || '64uk-42ks';

async function fetchPLUTO(bbl: string) {
  const token = process.env.NYC_OPENDATA_TOKEN;
  const url = new URL(`https://data.cityofnewyork.us/resource/${PLUTO_RESOURCE_ID}.json`);
  url.searchParams.set('$where', `bbl='${bbl}'`);

  const res = await fetch(url.toString(), {
    headers: token ? { 'X-App-Token': token } : {},
  });

  if (!res.ok) throw new Error(`PLUTO API error: ${res.status}`);
  const data = await res.json();
  if (data.length === 0) throw new Error(`No PLUTO data for BBL ${bbl}`);
  return data[0];
}

async function main() {
  const testBBL = '1008300001'; // Empire State Building
  console.log(`Testing PLUTO fetch for BBL: ${testBBL}...`);
  try {
    const data = await fetchPLUTO(testBBL);
    console.log('Success! Found data for:', data.address || data.ownername);
    console.log('Zoning:', data.zonedist1);
  } catch (err) {
    console.error('Test failed:', err);
  }
}

main();
