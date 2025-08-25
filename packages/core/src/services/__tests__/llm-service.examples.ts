/**
 * Example usage of the LLM Service
 * 
 * This file demonstrates how to use the LLM service for various tasks.
 * It's not part of the production code but serves as documentation and examples.
 */

import { LLMService, createLLMServiceFromEnv } from '../llm-service.js';
import type { LLMCompletionRequest, LLMModelConfig, LLMEmbedRequest, LLMEmbedManyRequest } from '../../types/llm.js';

/**
 * Example 1: Simple text completion
 */
async function simpleTextCompletion() {
  try {
    // Create service from environment variables
    const llmService = createLLMServiceFromEnv();
    
    // Initialize the service
    await llmService.initialize();
    
    // Simple completion
    const response = await llmService.simpleCompletion(
      'Explain what a devlog is in software development in one paragraph.'
    );
    
    console.log('Simple completion response:', response);
    
    return response;
  } catch (error) {
    console.error('Error in simple completion:', error);
    throw error;
  }
}

/**
 * Example 2: Advanced completion with custom configuration
 */
async function advancedCompletion() {
  try {
    const llmService = createLLMServiceFromEnv();
    await llmService.initialize();
    
    // Define model configuration
    const modelConfig: LLMModelConfig = {
      provider: 'openai',
      model: 'gpt-4',
      maxTokens: 500,
      temperature: 0.3, // Lower temperature for more focused responses
      topP: 0.9,
    };
    
    // Create completion request
    const request: LLMCompletionRequest = {
      messages: [
        {
          role: 'system',
          content: 'You are a helpful assistant that explains technical concepts clearly and concisely.',
        },
        {
          role: 'user',
          content: 'What are the benefits of using TypeScript over JavaScript for large applications?',
        },
      ],
      model: modelConfig,
    };
    
    const response = await llmService.generateCompletion(request);
    
    console.log('Advanced completion response:', {
      content: response.content,
      finishReason: response.finishReason,
      usage: response.usage,
    });
    
    return response;
  } catch (error) {
    console.error('Error in advanced completion:', error);
    throw error;
  }
}

/**
 * Example 3: Streaming completion
 */
async function streamingCompletion() {
  try {
    const llmService = createLLMServiceFromEnv();
    await llmService.initialize();
    
    const modelConfig: LLMModelConfig = {
      provider: 'openai',
      model: 'gpt-4',
      maxTokens: 300,
      temperature: 0.7,
    };
    
    const request: LLMCompletionRequest = {
      messages: [
        {
          role: 'user',
          content: 'Write a short story about a developer who discovers an AI that helps with coding.',
        },
      ],
      model: modelConfig,
    };
    
    console.log('Starting streaming completion...');
    let fullContent = '';
    
    for await (const chunk of llmService.generateStreamingCompletion(request)) {
      if (chunk.content) {
        process.stdout.write(chunk.content);
        fullContent += chunk.content;
      }
      
      if (chunk.isComplete) {
        console.log('\n\nStreaming completed with reason:', chunk.finishReason);
        break;
      }
    }
    
    return fullContent;
  } catch (error) {
    console.error('Error in streaming completion:', error);
    throw error;
  }
}

/**
 * Example 4: Structured output with schema (requires Zod)
 */
async function structuredOutput() {
  try {
    // This example would require Zod to be installed
    // For now, it's commented out but shows the pattern
    
    /*
    import { z } from 'zod';
    
    const llmService = createLLMServiceFromEnv();
    await llmService.initialize();
    
    // Define schema for structured output
    const TaskSchema = z.object({
      title: z.string(),
      description: z.string(),
      priority: z.enum(['low', 'medium', 'high']),
      estimatedHours: z.number(),
      tags: z.array(z.string()),
    });
    
    const modelConfig: LLMModelConfig = {
      provider: 'openai',
      model: 'gpt-4',
      maxTokens: 300,
      temperature: 0.3,
    };
    
    const request: LLMCompletionRequest = {
      messages: [
        {
          role: 'user',
          content: 'Create a development task for implementing user authentication in a web application.',
        },
      ],
      model: modelConfig,
    };
    
    const task = await llmService.generateStructuredOutput(
      request,
      TaskSchema,
      'Development Task'
    );
    
    console.log('Structured output:', task);
    return task;
    */
    
    console.log('Structured output example requires Zod schema library');
    return null;
  } catch (error) {
    console.error('Error in structured output:', error);
    throw error;
  }
}

/**
 * Example 5: Single text embedding
 */
async function singleEmbedding() {
  try {
    const llmService = createLLMServiceFromEnv();
    await llmService.initialize();
    
    // Simple embedding
    const embedding = await llmService.simpleEmbed(
      'This is a sample text for embedding generation'
    );
    
    console.log('Single embedding result:');
    console.log('- Dimensions:', embedding.length);
    console.log('- First 5 values:', embedding.slice(0, 5));
    
    return embedding;
  } catch (error) {
    console.error('Error in single embedding:', error);
    throw error;
  }
}

/**
 * Example 6: Multiple text embeddings
 */
async function multipleEmbeddings() {
  try {
    const llmService = createLLMServiceFromEnv();
    await llmService.initialize();
    
    const texts = [
      'Machine learning is a subset of artificial intelligence',
      'TypeScript provides static type checking for JavaScript',
      'React is a popular frontend framework',
      'Database optimization improves query performance',
    ];
    
    // Generate embeddings for multiple texts
    const embeddings = await llmService.simpleEmbedMany(texts);
    
    console.log('Multiple embeddings result:');
    console.log('- Number of embeddings:', embeddings.length);
    console.log('- Dimensions per embedding:', embeddings[0]?.length);
    
    // Calculate similarity between first two embeddings (cosine similarity)
    if (embeddings.length >= 2) {
      const similarity = calculateCosineSimilarity(embeddings[0], embeddings[1]);
      console.log('- Similarity between first two texts:', similarity.toFixed(4));
    }
    
    return embeddings;
  } catch (error) {
    console.error('Error in multiple embeddings:', error);
    throw error;
  }
}

/**
 * Example 7: Advanced embedding with custom model
 */
async function advancedEmbedding() {
  try {
    const llmService = createLLMServiceFromEnv();
    await llmService.initialize();
    
    // Advanced embedding request
    const request: LLMEmbedRequest = {
      text: 'Advanced text processing with large language models enables sophisticated natural language understanding.',
      model: 'text-embedding-3-large', // Use larger model for higher quality
      metadata: {
        source: 'documentation',
        category: 'ai',
      },
    };
    
    const response = await llmService.embed(request);
    
    console.log('Advanced embedding response:');
    console.log('- Embedding dimensions:', response.embedding.length);
    console.log('- Token usage:', response.usage?.tokens);
    console.log('- Metadata:', response.metadata);
    
    return response;
  } catch (error) {
    console.error('Error in advanced embedding:', error);
    throw error;
  }
}

/**
 * Helper function to calculate cosine similarity between two vectors
 */
function calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
  if (vecA.length !== vecB.length) {
    throw new Error('Vectors must have the same length');
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (normA * normB);
}

/**
 * Example 8: Error handling and configuration
 */
async function errorHandlingExample() {
  try {
    // Example of creating service with custom config
    const customService = new LLMService({
      apiKey: 'invalid-key',
      defaultModel: 'gpt-4',
      defaultModelConfig: {
        maxTokens: 100,
        temperature: 0.5,
      },
    });
    
    await customService.initialize();
    
    // This would fail with invalid API key
    await customService.simpleCompletion('Test prompt');
  } catch (error) {
    console.log('Expected error caught:', (error as Error).constructor.name);
    console.log('Error message:', (error as Error).message);
    
    // Check if it's a specific LLM error type
    if ((error as any).constructor.name === 'LLMAPIError') {
      console.log('API Error status code:', (error as any).statusCode);
    }
  }
}

/**
 * Run all examples
 */
export async function runLLMExamples() {
  console.log('=== LLM Service Examples ===\n');
  
  try {
    console.log('1. Simple Text Completion:');
    await simpleTextCompletion();
    console.log('\n---\n');
    
    console.log('2. Advanced Completion:');
    await advancedCompletion();
    console.log('\n---\n');
    
    console.log('3. Streaming Completion:');
    await streamingCompletion();
    console.log('\n---\n');
    
    console.log('4. Structured Output:');
    await structuredOutput();
    console.log('\n---\n');
    
    console.log('5. Single Embedding:');
    await singleEmbedding();
    console.log('\n---\n');
    
    console.log('6. Multiple Embeddings:');
    await multipleEmbeddings();
    console.log('\n---\n');
    
    console.log('7. Advanced Embedding:');
    await advancedEmbedding();
    console.log('\n---\n');
    
    console.log('8. Error Handling:');
    await errorHandlingExample();
    console.log('\n---\n');
    
    console.log('All examples completed!');
  } catch (error) {
    console.error('Example failed:', error);
  }
}

// Export individual examples for selective testing
export {
  simpleTextCompletion,
  advancedCompletion,
  streamingCompletion,
  structuredOutput,
  singleEmbedding,
  multipleEmbeddings,
  advancedEmbedding,
  errorHandlingExample,
};