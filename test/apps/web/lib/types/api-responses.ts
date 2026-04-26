/** GeoSearch v2 feature from geosearch.planninglabs.nyc */
export interface GeoSearchFeature {
  geometry: { type: "Point"; coordinates: [number, number] }
  properties: {
    name: string
    housenumber: string
    street: string
    postalcode: string
    borough: string
    neighbourhood: string
    label: string
    confidence: number
    addendum: {
      pad: { bbl: string; bin: string; version: string }
    }
  }
}

export interface GeoSearchResponse {
  type: "FeatureCollection"
  features: GeoSearchFeature[]
}

/** Socrata PLUTO row (64uk-42ks) */
export interface SocrataPlutoRow {
  borough: string
  block: string
  lot: string
  bbl: string
  address: string
  bldgclass: string
  landuse: string
  ownername: string
  lotarea: string
  bldgarea: string
  resarea: string
  officearea: string
  retailarea: string
  numfloors: string
  unitsres: string
  unitstotal: string
  yearbuilt: string
  zonedist1: string
  builtfar: string
  residfar: string
  commfar: string
  facilfar: string
  latitude: string
  longitude: string
}

/** Socrata DOB Violations row (ibzj-phrd) — keyed by BIN, not BBL */
export interface SocrataDobViolationRow {
  isn_dob_bis_viol: string
  boro: string
  bin: string
  block: string
  lot: string
  issue_date: string
  violation_type_code: string
  violation_number: string
  house_number: string
  street: string
  disposition_date: string
  disposition_comments: string
  violation_category: string
  number: string
}

/** Socrata HPD Violations row (csn4-vhvf) — keyed by boro+block+lot */
export interface SocrataHpdViolationRow {
  violationid: string
  boroid: string
  boro: string
  housenumber: string
  streetname: string
  block: string
  lot: string
  class: string // A, B, or C
  inspectiondate: string
  approveddate: string
  currentstatus: string
  currentstatusdate: string
  novdescription: string
  violationstatus: string
}

/** Socrata DOB Permits row (ipu4-2q9a) — keyed by BIN or block+lot */
export interface SocrataDobPermitRow {
  borough: string
  bin__: string
  house__: string
  street_name: string
  job__: string
  job_type: string
  block: string
  lot: string
  permit_status: string
  filing_status: string
  permit_type: string
  filing_date: string
  issuance_date: string
  work_type: string
}

/** Socrata HPD Complaints row (cewg-5fre) — 311 complaints with location */
export interface SocrataHpdComplaintRow {
  unique_key: string
  created_date: string
  closed_date: string
  complaint_type: string
  descriptor: string
  incident_address: string
  incident_zip: string
  status: string
  borough: string
  latitude: string
  longitude: string
}

/** Socrata Rolling Sales row (usep-8jbt) */
export interface SocrataRollingSalesRow {
  borough: string
  neighborhood: string
  building_class_category: string
  building_class_at_present: string
  address: string
  zip_code: string
  residential_units: string
  commercial_units: string
  total_units: string
  land_square_feet: string
  gross_square_feet: string
  year_built: string
  sale_price: string
  sale_date: string
  block: string
  lot: string
}

/** Socrata NYPD Complaints row (5uac-w243) */
export interface SocrataNypdComplaintRow {
  cmplnt_num: string
  boro_nm: string
  cmplnt_fr_dt: string
  law_cat_cd: string // FELONY, MISDEMEANOR, VIOLATION
  ofns_desc: string
  pd_desc: string
  latitude: string
  longitude: string
}

/** Census ACS API response row */
export type CensusAcsRow = string[]

/** FCC geocoder response */
export interface FccGeocoderResponse {
  Block: {
    FIPS: string
  }
  County: {
    FIPS: string
    name: string
  }
  State: {
    FIPS: string
    code: string
    name: string
  }
  status: string
}

/** HUD FMR API response — field names use hyphens */
export interface HudFmrResponse {
  data: {
    area_name: string
    basicdata: {
      Efficiency: number
      "One-Bedroom": number
      "Two-Bedroom": number
      "Three-Bedroom": number
      "Four-Bedroom": number
      year: string
    }
  }
}
