async function main() {
  const address = '350 5th Ave, New York, NY';
  console.log(`Geocoding address: ${address}...`);
  const url = `https://geosearch.planninglabs.nyc/v2/search?text=${encodeURIComponent(address)}&size=1`;
  
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    console.log('Success! Result:', JSON.stringify(data.features[0].properties.label, null, 2));
    console.log('Coordinates:', data.features[0].geometry.coordinates);
    console.log('BBL:', data.features[0].properties.addendum.pad.bbl);
  } catch (err) {
    console.error('Test failed:', err);
  }
}

main();
