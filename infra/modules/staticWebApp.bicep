param environment string
param location string

resource staticWebApp 'Microsoft.Web/staticSites@2023-12-01' = {
  name: 'words-${environment}-web'
  location: location
  sku: {
    name: 'Free'
    tier: 'Free'
  }
  properties: {
    buildProperties: {
      appLocation: 'apps/web'
      outputLocation: 'dist'
    }
  }
}

output swaUrl string = staticWebApp.properties.defaultHostname
