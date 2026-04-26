export const GEOSEARCH_BASE_URL =
  "https://geosearch.planninglabs.nyc/v2/search"

export const SOCRATA_BASE_URL = "https://data.cityofnewyork.us/resource"

export const SOCRATA_DATASETS = {
  pluto: "64uk-42ks",
  dobViolations: "ibzj-phrd",
  hpdViolations: "csn4-vhvf",
  dobPermits: "ipu4-2q9a",
  hpdComplaints: "cewg-5fre",
  rollingSales: "usep-8jbt",
  nypdComplaints: "5uac-w243",
} as const

export const CENSUS_BASE_URL =
  "https://api.census.gov/data/2022/acs/acs5"

export const FCC_GEOCODER_URL =
  "https://geo.fcc.gov/api/census/block/find"

export const HUD_FMR_BASE_URL =
  "https://www.huduser.gov/hudapi/public/fmr/data"
