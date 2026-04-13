import { z } from "zod"

export const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  ADMIN_PASSWORD: z.string().min(1, "ADMIN_PASSWORD is required"),
  MEMBER_PASSWORD: z.string().optional(),
  MINIMAX_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  ZHIPU_API_KEY: z.string().optional(),
  GEMINI_API_KEY: z.string().optional(),
  KIMI_API_KEY: z.string().optional(),
  DEEPSEEK_API_KEY: z.string().optional(),
  TAVILY_API_KEY: z.string().optional(),
  NEXT_SERVER_ACTIONS_ENCRYPTION_KEY: z.string().optional(),
})

export type ServerEnv = z.infer<typeof serverEnvSchema>
