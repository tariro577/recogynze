import { UserProfile } from '../types';

const isConfigured = (): boolean =>
  Boolean(process.env.AZURE_TENANT_ID && process.env.AZURE_CLIENT_ID && process.env.AZURE_CLIENT_SECRET);

async function getToken(): Promise<string> {
  const res = await fetch(
    `https://login.microsoftonline.com/${process.env.AZURE_TENANT_ID}/oauth2/v2.0/token`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: process.env.AZURE_CLIENT_ID!,
        client_secret: process.env.AZURE_CLIENT_SECRET!,
        scope: 'https://graph.microsoft.com/.default'
      })
    }
  );
  const data = await res.json() as { access_token?: string; error_description?: string };
  if (!data.access_token) {
    throw new Error(`Graph token error: ${data.error_description || 'unknown'}`);
  }
  return data.access_token;
}

/**
 * Fetches all enabled users from Azure AD with their display name, email and
 * department. Paginates automatically. External/guest accounts (#EXT#) are
 * filtered out. Returns an empty array if Graph is not configured.
 */
export async function syncUsersFromGraph(): Promise<UserProfile[]> {
  if (!isConfigured()) {
    return [];
  }

  let token: string;
  try {
    token = await getToken();
  } catch (err) {
    console.error('[recognyze] Graph token failed:', (err as Error).message);
    return [];
  }

  const users: UserProfile[] = [];
  let url: string | null =
    'https://graph.microsoft.com/v1.0/users' +
    '?$select=id,displayName,userPrincipalName,department' +
    '&$filter=accountEnabled eq true' +
    '&$top=999';

  while (url) {
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) {
      console.error('[recognyze] Graph users fetch failed:', res.status, await res.text());
      break;
    }
    const data = await res.json() as {
      value?: Array<{ id: string; displayName: string; userPrincipalName: string; department?: string }>;
      '@odata.nextLink'?: string;
    };

    for (const u of data.value ?? []) {
      if (!u.userPrincipalName || u.userPrincipalName.includes('#EXT#')) continue;
      users.push({
        id: u.id,
        displayName: u.displayName || u.userPrincipalName.split('@')[0],
        email: u.userPrincipalName.toLowerCase(),
        department: u.department || 'General'
      });
    }

    url = data['@odata.nextLink'] ?? null;
  }

  console.log(`[recognyze] Graph sync: ${users.length} users loaded`);
  return users;
}
