import * as dotenv from 'dotenv';
dotenv.config();

async function testDataSource(name: string, url: string) {
  console.log(`\nTesting ${name}...`);
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    console.log(`Status: ${res.status} ${res.statusText}`);
    if (res.ok) {
      console.log(`Success! ${name} is reachable.`);
    } else {
      const text = await res.text();
      console.log(`Error Response: ${text.substring(0, 100)}...`);
    }
  } catch (err) {
    console.error(`${name} failed:`, err instanceof Error ? err.message : err);
  }
}

async function main() {
  const lat = 40.7484;
  const lng = -73.9857;
  const bbl = '1008350041';

  // 1. FEMA Flood Zone (Federal)
  const femaUrl = `https://hazards.fema.gov/arcgis/rest/services/public/NFHL/MapServer/28/query?geometry=${lng},${lat}&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=FLD_ZONE,ZONE_SUBTY,SFHA_TF&returnGeometry=false&f=json&inSR=4326`;
  await testDataSource('FEMA Flood Zone', femaUrl);

  // 2. DCP GIS Zoning (NYC)
  const dcpZoningUrl = `https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/nyzd/FeatureServer/0/query?geometry=${lng},${lat}&geometryType=esriGeometryPoint&spatialRel=esriSpatialRelIntersects&outFields=ZONEDIST&returnGeometry=false&f=json&inSR=4326`;
  await testDataSource('DCP GIS Zoning', dcpZoningUrl);

  // 3. MapPLUTO Geometry (NYC)
  const plutoGeomUrl = `https://services5.arcgis.com/GfwWNkhOj9bNBqoJ/arcgis/rest/services/MAPPLUTO/FeatureServer/0/query?where=bbl='${bbl}'&outFields=BBL&returnGeometry=true&outSR=4326&f=geojson&resultRecordCount=1`;
  await testDataSource('MapPLUTO Geometry', plutoGeomUrl);

  // 4. HUD User API (Federal - requires token)
  if (process.env.HUD_API_TOKEN) {
    const hudUrl = `https://www.huduser.gov/hudapi/public/fmr/data/3606199999`; // Example FIPS for Manhattan
    console.log('\nTesting HUD User API (with token)...');
    try {
      const res = await fetch(hudUrl, {
        headers: { Authorization: `Bearer ${process.env.HUD_API_TOKEN}` }
      });
      console.log(`Status: ${res.status}`);
    } catch (err) { console.error('HUD failed'); }
  } else {
    console.log('\nSkipping HUD (No Token)');
  }

  // 5. Census API (Federal - key optional for low volume)
  const censusKey = process.env.CENSUS_API_KEY;
  const censusUrl = `https://api.census.gov/data/2021/acs/acs5?get=NAME,B19013_001E&for=zip%20code%20tabulation%20area:10001${censusKey ? `&key=${censusKey}` : ''}`;
  await testDataSource('US Census API', censusUrl);
}

main();
