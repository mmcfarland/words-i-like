targetScope = 'resourceGroup'

@description('Environment name')
param environment string = 'staging'

@description('Location for resources')
param location string = resourceGroup().location

@description('PostgreSQL admin password')
@secure()
param dbAdminPassword string

module postgres 'modules/postgres.bicep' = {
  name: 'postgres'
  params: {
    environment: environment
    location: location
    adminPassword: dbAdminPassword
  }
}

module containerApp 'modules/containerApp.bicep' = {
  name: 'containerApp'
  params: {
    environment: environment
    location: location
    databaseUrl: postgres.outputs.connectionString
  }
}

module staticWebApp 'modules/staticWebApp.bicep' = {
  name: 'staticWebApp'
  params: {
    environment: environment
    location: location
    apiUrl: containerApp.outputs.apiUrl
  }
}
