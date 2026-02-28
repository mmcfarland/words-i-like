import { authService } from './auth'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001'

export interface AiExamplesResponse {
  examples: string[]
  source: 'azure' | 'stub'
  remaining: number
  limit: number
}

export const aiService = {
  async generateExamples(wordId: string): Promise<AiExamplesResponse> {
    const response = await fetch(`${API_URL}/api/words/${wordId}/examples`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authService.getAuthHeaders(),
      },
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Failed to generate examples' }))
      throw new Error(error.message || `HTTP ${response.status}`)
    }

    return response.json()
  },
}
