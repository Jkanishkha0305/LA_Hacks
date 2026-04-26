import { z } from "zod"

const envSchema = z.object({
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().optional().default(""),
  GOOGLE_MAPS_API_KEY: z.string().min(1, "GOOGLE_MAPS_API_KEY is required"),
  SOCRATA_APP_TOKEN: z.string().optional().default(""),
  CENSUS_API_KEY: z.string().min(1, "CENSUS_API_KEY is required"),
  HUD_API_TOKEN: z.string().min(1, "HUD_API_TOKEN is required"),
})

function validateEnv() {
  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    const missing = result.error.issues
      .map((i) => `  ${i.path.join(".")}: ${i.message}`)
      .join("\n")
    throw new Error(`Missing required environment variables:\n${missing}`)
  }
  return result.data
}

export const env = validateEnv()
