/**
 * Centralised configuration. The app stores its own data (in-memory by default,
 * or Postgres when POSTGRES_URL is set) and takes user identity from the Teams
 * client, so there are no required SharePoint / Azure AD settings.
 */
export interface AiConfig {
  /** True when the gateway credentials are present — enables the assistant. */
  enabled: boolean;
  /** True when enabled AND AI moderation hasn't been switched off via AI_MODERATION=false. */
  moderationEnabled: boolean;
  apiKey: string;
  baseUrl: string;
  model: string;
}

export interface AppConfig {
  port: number;
  corsOrigins: string[];
  hasDatabase: boolean;
  ai: AiConfig;
}

let cached: AppConfig | undefined;

/** Strip accidental wrapping quotes from .env values ("value" / 'value'). */
const envValue = (raw: string | undefined): string =>
  (raw || '').trim().replace(/^['"]|['"]$/g, '');

export const getConfig = (): AppConfig => {
  if (cached) {
    return cached;
  }
  const aiApiKey = envValue(process.env.ANTHROPIC_API_KEY);
  const aiBaseUrl = envValue(process.env.ANTHROPIC_BASE_URL).replace(/\/+$/, '');
  const aiModel = envValue(process.env.ANTHROPIC_MODEL) || 'Qwen3.5-122b';
  const aiEnabled = Boolean(aiApiKey && aiBaseUrl);
  cached = {
    port: Number(process.env.PORT) || 3000,
    corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:4200')
      .split(',')
      .map(origin => origin.trim())
      .filter(Boolean),
    hasDatabase: Boolean(
      process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL
    ),
    ai: {
      enabled: aiEnabled,
      moderationEnabled: aiEnabled && envValue(process.env.AI_MODERATION).toLowerCase() !== 'false',
      apiKey: aiApiKey,
      baseUrl: aiBaseUrl,
      model: aiModel
    }
  };
  return cached;
};

export const validateConfig = (): void => {
  getConfig();
};
