export const environment = {
  production: true,
  apiBaseUrl: 'https://recogynze-api.vercel.app/api',
  azure: {
    clientId: 'YOUR_CLIENT_ID',
    tenantId: 'YOUR_TENANT_ID',
    // Scopes for direct Microsoft Graph calls (the user's own profile + photo).
    scopes: ['User.Read'],
    // Scopes used when calling the Recognyze backend API.
    //  - Passthrough mode: use the Graph scopes the backend forwards.
    //  - OBO mode: use your exposed API scope, e.g. ['api://YOUR_CLIENT_ID/access_as_user'].
    apiScopes: ['User.Read', 'Sites.ReadWrite.All', 'User.ReadBasic.All'],
    redirectUri: 'https://recogynze.vercel.app'
  },
  sharepoint: {
    siteUrl: 'https://econetzimbabwe.sharepoint.com/sites/recognyze'
  },
  teams: {
    appId: 'YOUR_TEAMS_APP_ID'
  }
};
