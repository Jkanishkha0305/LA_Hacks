import * as dotenv from 'dotenv';
dotenv.config();

const LA_COUNTY_PARCEL_IDENTIFY = 'https://public.gis.lacounty.gov/public/rest/services/LACounty_Cache/LACounty_Parcel/MapServer/identify';

async function fetchLAParcelNear(lat: number, lng: number) {
  try {
    const delta = 0.003;
    const url = new URL(LA_COUNTY_PARCEL_IDENTIFY);
    url.searchParams.set('geometry', `${lng},${lat}`);
    url.searchParams.set('geometryType', 'esriGeometryPoint');
    url.searchParams.set('sr', '4326');
    url.searchParams.set('layers', 'all');
    url.searchParams.set('tolerance', '20');
    url.searchParams.set('mapExtent', `${lng - delta},${lat - delta},${lng + delta},${lat + delta}`);
    url.searchParams.set('imageDisplay', '400,400,96');
    url.searchParams.set('returnGeometry', 'true');
    url.searchParams.set('f', 'json');

    console.log(`Requesting LA Parcel data for: ${lat}, ${lng}...`);
    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const result = data.results?.[0];
    if (!result?.attributes) return null;
    return result.attributes;
  } catch (err) {
    console.error('LA Parcel fetch failed:', err);
    return null;
  }
}

async function main() {
  // Test address: 1200 W 7th St, Los Angeles, CA 90017 (LA Housing Dept building)
  const lat = 34.0501;
  const lng = -118.2635;

  const data = await fetchLAParcelNear(lat, lng);
  if (data) {
    console.log('Success! Found LA Parcel:');
    console.log('APN:', data.APN);
    console.log('Address:', data.SitusFullAddress);
    console.log('Lot Area:', data['Shape.STArea()'] || data['Shape_Area']);
    console.log('Use Description:', data.UseDescription);
  } else {
    console.log('No LA parcel data found for those coordinates.');
  }
}

main();
