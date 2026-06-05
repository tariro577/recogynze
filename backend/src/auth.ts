import { Request, Response, NextFunction } from 'express';
import jwt, { JwtHeader, SigningKeyCallback } from 'jsonwebtoken';
import { JwksClient } from 'jwks-rsa';
import { ConfidentialClientApplication } from '@azure/msal-node';
import { AadConfig, getConfig } from './config';

export type AuthenticatedRequest = Request & { accessToken?: string };

let jwksClient: JwksClient | undefined;
let cca: ConfidentialClientApplication | undefined;

const getJwksClient = (aad: AadConfig): JwksClient => {
  if (!jwksClient) {
    jwksClient = new JwksClient({
      jwksUri: `https://login.microsoftonline.com/${aad.tenantId}/discovery/v2.0/keys`,
      cache: true,
      rateLimit: true
    });
  }
  return jwksClient;
};

const getConfidentialClient = (aad: AadConfig): ConfidentialClientApplication => {
  if (!cca) {
    cca = new ConfidentialClientApplication({
      auth: {
        clientId: aad.clientId,
        authority: `https://login.microsoftonline.com/${aad.tenantId}`,
        clientSecret: aad.clientSecret
      }
    });
  }
  return cca;
};

/** Verify the incoming token's signature, audience and issuer against the tenant's JWKS. */
const validateToken = (token: string, aad: AadConfig): Promise<void> =>
  new Promise((resolve, reject) => {
    const client = getJwksClient(aad);
    const getKey = (header: JwtHeader, callback: SigningKeyCallback) => {
      client
        .getSigningKey(header.kid)
        .then(key => callback(null, key.getPublicKey()))
        .catch(err => callback(err as Error));
    };

    jwt.verify(
      token,
      getKey,
      {
        // audience always has at least one entry (built from clientId in config).
        audience: aad.audience as [string, ...string[]],
        // Accept both v1.0 (sts.windows.net) and v2.0 (login.microsoftonline.com) issuers.
        issuer: [
          `https://login.microsoftonline.com/${aad.tenantId}/v2.0`,
          `https://sts.windows.net/${aad.tenantId}/`
        ],
        algorithms: ['RS256']
      },
      (err: jwt.VerifyErrors | null) => (err ? reject(err) : resolve())
    );
  });

/** Exchange the validated user token for a Microsoft Graph token via On-Behalf-Of. */
const acquireGraphToken = async (assertion: string, aad: AadConfig): Promise<string> => {
  const result = await getConfidentialClient(aad).acquireTokenOnBehalfOf({
    oboAssertion: assertion,
    scopes: ['https://graph.microsoft.com/.default']
  });
  if (!result?.accessToken) {
    throw new Error('On-Behalf-Of exchange returned no access token.');
  }
  return result.accessToken;
};

/**
 * Authentication middleware. In OBO mode it validates the API token and swaps it
 * for a Graph token; in passthrough mode it forwards the caller's Graph token.
 * Either way, downstream services receive a usable Graph token on req.accessToken.
 */
export const authenticate = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  const token = (req.headers.authorization || '').replace(/^Bearer\s+/i, '').trim();
  if (!token) {
    return res.status(401).json({ message: 'Missing access token' });
  }

  const config = getConfig();
  if (config.authMode === 'passthrough' || !config.aad) {
    req.accessToken = token;
    return next();
  }

  try {
    await validateToken(token, config.aad);
    req.accessToken = await acquireGraphToken(token, config.aad);
    return next();
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[recognyze] auth failed:', (error as Error).message);
    return res.status(401).json({ message: 'Invalid or expired access token.' });
  }
};
