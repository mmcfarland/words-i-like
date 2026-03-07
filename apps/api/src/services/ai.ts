import process from 'node:process'

export interface AiExamplesResult {
  examples: string[]
  source: 'azure'
}

export async function generateExamples(word: string): Promise<AiExamplesResult> {
  const endpoint = process.env.AZURE_OPENAI_ENDPOINT
  const apiKey = process.env.AZURE_OPENAI_API_KEY
  const deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o'

  if (!endpoint || !apiKey) {
    throw new Error('AI examples are not configured')
  }

  const url = `${endpoint}/openai/deployments/${deployment}/chat/completions?api-version=2024-02-15-preview`
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    body: JSON.stringify({
      messages: [
        {
          role: 'system',
          content: 'You generate natural, diverse usage examples for English words. Return exactly 3 example sentences, one per line. No numbering or bullets.',
        },
        {
          role: 'user',
          content: `Generate 3 usage examples for the word "${word}".`,
        },
      ],
      max_tokens: 300,
      temperature: 0.8,
    }),
  })

  if (!response.ok) {
    throw new Error(`AI provider request failed (${response.status})`)
  }

  const data = await response.json()
  const content: string = data.choices?.[0]?.message?.content || ''
  const examples = content
    .split('\n')
    .map((line: string) => line.trim())
    .filter((line: string) => line.length > 0)
    .slice(0, 3)

  if (examples.length === 0) {
    throw new Error('AI provider returned no examples')
  }

  return { examples, source: 'azure' }
}
