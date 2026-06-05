import { BrowserCacheLocation, Configuration, InteractionType, LogLevel, PublicClientApplication } from '@azure/msal-browser';
import { MsalGuardConfiguration } from '@azure/msal-angular';
import { environment } from '../environments/environment';

export const msalConfig: Configuration = {
  auth: {
    clientId: environment.azure.clientId,
    authority: `https://login.microsoftonline.com/${environment.azure.tenantId}`,
    redirectUri: environment.azure.redirectUri
  },
  cache: {
    cacheLocation: BrowserCacheLocation.LocalStorage,
    storeAuthStateInCookie: false
  },
  system: {
    loggerOptions: {
      loggerCallback: (_level: LogLevel, message: string) => {
        if (!environment.production) {
          console.debug(`[MSAL] ${message}`);
        }
      },
      logLevel: LogLevel.Info,
      piiLoggingEnabled: false
    }
  }
};

export const msalInstanceFactory = () => new PublicClientApplication(msalConfig);

export const msalGuardConfigFactory = (): MsalGuardConfiguration => ({
  interactionType: InteractionType.Redirect,
  authRequest: {
    scopes: Array.from(new Set([...environment.azure.apiScopes, ...environment.azure.scopes]))
  }
});
