/**
 * Centralised configuration. The app stores its own data (in-memory by default,
 * or Postgres when POSTGRES_URL is set) and takes user identity from the Teams
 * client, so there are no required SharePoint / Azure AD settings.
 */
export interface AppConfig {
  port: number;
  corsOrigins: string[];
  hasDatabase: boolean;
}

let cached: AppConfig | undefined;

export const getConfig = (): AppConfig => {
  if (cached) {
    return cached;
  }
  cached = {
    port: Number(process.env.PORT) || 3000,
    corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:4200')
      .split(',')
      .map(origin => origin.trim())
      .filter(Boolean),
    hasDatabase: Boolean(
      process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || process.env.DATABASE_URL
    )
  };
  return cached;
};

export const validateConfig = (): void => {
  getConfig();
};
