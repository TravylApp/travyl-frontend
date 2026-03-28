// services/lib/embeddings.ts
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime'

const client = new BedrockRuntimeClient({})

const MODEL_ID = 'amazon.titan-embed-text-v2:0'

export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    const response = await client.send(
      new InvokeModelCommand({
        modelId: MODEL_ID,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          inputText: text,
          dimensions: 1024,
        }),
      }),
    )

    const result = JSON.parse(new TextDecoder().decode(response.body))
    return result.embedding as number[]
  } catch (err: any) {
    console.error('[embeddings] Bedrock invocation failed:', {
      model: MODEL_ID,
      errorName: err.name,
      errorMessage: err.message,
      errorStack: err.stack?.split('\n')?.[0],
    })
    throw err  // re-throw so caller can fall back
  }
}
