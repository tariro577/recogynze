/**
 * Centralised, validated configuration. The app only requires a site id and the
 * Recognitions list id. The Badges and Reactions lists are optional:
 *  - No Badges list  -> the six built-in badges are used.
 *  - No Reactions list -> the 👏🏆❤️ reaction buttons are disabled (counts stay 0).
 * Required values fail loudly at boot; optional ones are simply left undefined.
 */
/**
 * Optional Azure AD settings. When all are present the backend becomes a real
 * trust boundary: it validates the incoming API token and exchanges it
 * On-Behalf-Of for a Graph token. When absent it falls back to forwarding the
 * caller's Graph token directly (passthrough) so local dev stays simple.
 */
export interface AadConfig {
  tenantId: string;
  clientId: string;
  clientSecret: string;
  /** Expected audience of the incoming token (defaults to clientId / api://clientId). */
  audience: string[];
}

export interface AppConfig {
  port: number;
  corsOrigins: string[];
  siteId: string;
  recognitionsListId: string;
  badgesListId?: string;
  reactionsListId?: string;
  authMode: 'obo' | 'passthrough';
  aad?: AadConfig;
}

let cached: AppConfig | undefined;

const required = (name: string): string => {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(
      `Missing required environment variable: ${name}. ` +
        `Set it in backend/.env (see README) before starting the server.`
    );
  }
  return value.trim();
};

const buildAadConfig = (): AadConfig | undefined => {
  const tenantId = process.env.AAD_TENANT_ID?.trim();
  const clientId = process.env.AAD_CLIENT_ID?.trim();
  const clientSecret = process.env.AAD_CLIENT_SECRET?.trim();
  if (!tenantId || !clientId || !clientSecret) {
    return undefined;
  }
  const audience = (process.env.AAD_API_AUDIENCE || `${clientId},api://${clientId}`)
    .split(',')
    .map(value => value.trim())
    .filter(Boolean);
  return { tenantId, clientId, clientSecret, audience };
};

export const getConfig = (): AppConfig => {
  if (cached) {
    return cached;
  }
  const aad = buildAadConfig();
  cached = {
    port: Number(process.env.PORT) || 3000,
    corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:4200')
      .split(',')
      .map(origin => origin.trim())
      .filter(Boolean),
    siteId: required('RECOGNYZE_SITE_ID'),
    recognitionsListId: required('RECOGNYZE_RECOGNITIONS_LIST_ID'),
    badgesListId: process.env.RECOGNYZE_BADGES_LIST_ID?.trim() || undefined,
    reactionsListId: process.env.RECOGNYZE_REACTIONS_LIST_ID?.trim() || undefined,
    authMode: aad ? 'obo' : 'passthrough',
    aad
  };
  return cached;
};

/** Validate eagerly at boot so misconfiguration surfaces immediately, not on first request. */
export const validateConfig = (): void => {
  getConfig();
};
