param environment string
param location string
@secure()
param adminPassword string

var serverName = 'words-${environment}-pg'

resource postgresServer 'Microsoft.DBforPostgreSQL/flexibleServers@2023-12-01-preview' = {
  name: serverName
  location: location
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    version: '16'
    administratorLogin: 'wordsadmin'
    administratorLoginPassword: adminPassword
    storage: {
      storageSizeGB: 32
    }
  }
}

resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2023-12-01-preview' = {
  parent: postgresServer
  name: 'words'
}

output connectionString string = 'postgresql://wordsadmin:${adminPassword}@${postgresServer.properties.fullyQualifiedDomainName}:5432/words'
