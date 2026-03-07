param environment string
param location string
@secure()
param databaseUrl string
param openaiEndpoint string = ''
param openaiAccountName string
param openaiDeployment string = 'gpt-4o-mini'
@secure()
param jwtSecret string
param googleClientId string = ''
@secure()
param googleClientSecret string = ''
param image string = 'mcr.microsoft.com/azuredocs/containerapps-helloworld:latest'

var appName = 'words-${environment}-api'
var acrName = 'wordsacr${environment}'

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: acrName
  location: location
  sku: { name: 'Basic' }
  properties: { adminUserEnabled: true }
}

resource containerAppEnv 'Microsoft.App/managedEnvironments@2023-11-02-preview' = {
  name: 'words-${environment}-env'
  location: location
  properties: {}
}

resource openai 'Microsoft.CognitiveServices/accounts@2024-10-01' existing = {
  name: openaiAccountName
}

resource containerApp 'Microsoft.App/containerApps@2023-11-02-preview' = {
  name: appName
  location: location
  properties: {
    managedEnvironmentId: containerAppEnv.id
    configuration: {
      ingress: {
        external: true
        targetPort: 3001
      }
      registries: [
        {
          server: acr.properties.loginServer
          username: acr.listCredentials().username
          passwordSecretRef: 'acr-password'
        }
      ]
      secrets: [
        { name: 'database-url', value: databaseUrl }
        { name: 'acr-password', value: acr.listCredentials().passwords[0].value }
        { name: 'openai-key', value: openai.listKeys().key1 }
        { name: 'jwt-secret', value: jwtSecret }
        { name: 'google-secret', value: googleClientSecret }
      ]
    }
    template: {
      containers: [
        {
          name: 'api'
          image: image
          resources: {
            cpu: json('0.25')
            memory: '0.5Gi'
          }
          env: [
            { name: 'DATABASE_URL', secretRef: 'database-url' }
            { name: 'PORT', value: '3001' }
            { name: 'NODE_ENV', value: 'production' }
            { name: 'AZURE_OPENAI_ENDPOINT', value: openaiEndpoint }
            { name: 'AZURE_OPENAI_API_KEY', secretRef: 'openai-key' }
            { name: 'AZURE_OPENAI_DEPLOYMENT', value: openaiDeployment }
            { name: 'JWT_SECRET', secretRef: 'jwt-secret' }
            { name: 'GOOGLE_CLIENT_ID', value: googleClientId }
            { name: 'GOOGLE_CLIENT_SECRET', secretRef: 'google-secret' }
          ]
        }
      ]
      scale: {
        minReplicas: 0
        maxReplicas: 2
      }
    }
  }
}

output apiUrl string = 'https://${containerApp.properties.configuration.ingress.fqdn}'
