targetScope = 'resourceGroup'

@description('Environment name')
param environment string = 'staging'

@description('Location for resources')
param location string = resourceGroup().location

@description('PostgreSQL admin password')
@secure()
param dbAdminPassword string

@description('JWT signing secret for API auth')
@secure()
param jwtSecret string

@description('Google OAuth client ID')
param googleClientId string = ''

@description('Google OAuth client secret')
@secure()
param googleClientSecret string = ''

module postgres 'modules/postgres.bicep' = {
  name: 'postgres'
  params: {
    environment: environment
    location: location
    adminPassword: dbAdminPassword
  }
}

module openai 'modules/openai.bicep' = {
  name: 'openai'
  params: {
    environment: environment
    location: location
  }
}

var databaseUrl = 'postgresql://wordsadmin:${dbAdminPassword}@${postgres.outputs.host}:5432/words?sslmode=require'

module containerApp 'modules/containerApp.bicep' = {
  name: 'containerApp'
  params: {
    environment: environment
    location: location
    databaseUrl: databaseUrl
    openaiEndpoint: openai.outputs.endpoint
    openaiAccountName: openai.outputs.accountName
    openaiDeployment: openai.outputs.deploymentName
    jwtSecret: jwtSecret
    googleClientId: googleClientId
    googleClientSecret: googleClientSecret
  }
}

module staticWebApp 'modules/staticWebApp.bicep' = {
  name: 'staticWebApp'
  params: {
    environment: environment
    location: location
  }
}

// ── Outputs ──
output apiUrl string = containerApp.outputs.apiUrl
output swaUrl string = staticWebApp.outputs.swaUrl
