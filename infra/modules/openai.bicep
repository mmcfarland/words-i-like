param environment string
param location string

var accountName = 'words-${environment}-oai'

resource openai 'Microsoft.CognitiveServices/accounts@2024-10-01' = {
  name: accountName
  location: location
  kind: 'OpenAI'
  sku: { name: 'S0' }
  properties: {
    publicNetworkAccess: 'Enabled'
  }
}

resource gpt4oMini 'Microsoft.CognitiveServices/accounts/deployments@2024-10-01' = {
  parent: openai
  name: 'gpt-4o-mini'
  sku: {
    name: 'GlobalStandard'
    capacity: 10  // 10K tokens-per-minute — plenty for word lookups
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: 'gpt-4o-mini'
      version: '2024-07-18'
    }
  }
}

output endpoint string = openai.properties.endpoint
output deploymentName string = gpt4oMini.name
output accountName string = openai.name
