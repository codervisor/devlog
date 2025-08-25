/**
 * LLM (Large Language Model) service for interacting with OpenAI and Azure OpenAI
 * using the Vercel AI SDK
 */

import { generateObject, generateText, streamText, embed, embedMany } from 'ai';
import { openai } from '@ai-sdk/openai';
import type {
  LLMProvider,
  LLMModelConfig,
  LLMCompletionRequest,
  LLMCompletionResponse,
  LLMStreamChunk,
  LLMMessage,
  LLMEmbedRequest,
  LLMEmbedManyRequest,
  LLMEmbedResponse,
  LLMEmbedManyResponse,
} from '../types/llm.js';
import {
  LLMError,
  LLMConfigError,
  LLMAPIError,
  LLMRateLimitError,
} from '../types/llm.js';

/**
 * OpenAI/Azure OpenAI specific configuration
 */
export interface LLMServiceConfig {
  /** OpenAI API key */
  apiKey: string;
  /** Base URL for API (for Azure OpenAI or custom endpoints) */
  baseURL?: string;
  /** Default model to use */
  defaultModel?: string;
  /** Default embedding model to use */
  defaultEmbeddingModel?: string;
  /** Organization ID (OpenAI only) */
  organization?: string;
  /** API version (Azure OpenAI only) */
  apiVersion?: string;
  /** Default model configuration */
  defaultModelConfig?: Partial<LLMModelConfig>;
}

/**
 * Service for LLM interactions with OpenAI and Azure OpenAI
 */
export class LLMService {
  private static instance: LLMService | null = null;
  private config: LLMServiceConfig;
  private provider: any;
  private initPromise: Promise<void> | null = null;

  constructor(config: LLMServiceConfig) {
    this.config = config;
  }

  /**
   * Get singleton instance
   */
  static getInstance(config?: LLMServiceConfig): LLMService {
    if (!LLMService.instance) {
      if (!config) {
        throw new LLMConfigError('LLMService requires configuration on first initialization');
      }
      LLMService.instance = new LLMService(config);
    }
    return LLMService.instance;
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._initialize();
    return this.initPromise;
  }

  private async _initialize(): Promise<void> {
    try {
      // The openai function from @ai-sdk/openai is used differently
      // It's a provider factory, not a configuration function
      this.provider = openai;
    } catch (error) {
      throw new LLMConfigError(
        `Failed to initialize LLM provider: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'openai'
      );
    }
  }

  /**
   * Ensure service is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.provider) {
      await this.initialize();
    }
  }

  /**
   * Convert our message format to AI SDK format
   */
  private convertMessages(messages: LLMMessage[]) {
    return messages.map(msg => {
      // Convert to AI SDK message format
      const convertedMsg: any = {
        role: msg.role === 'function' ? 'assistant' : msg.role, // Convert function to assistant
        content: msg.content,
      };

      // Add name if present
      if (msg.name) {
        convertedMsg.name = msg.name;
      }

      return convertedMsg;
    });
  }

  /**
   * Handle errors from the AI SDK and convert to our error types
   */
  private handleError(error: any): never {
    if (error.status === 429 || error.message?.includes('rate limit')) {
      const retryAfter = error.headers?.['retry-after'] 
        ? parseInt(error.headers['retry-after']) 
        : undefined;
      throw new LLMRateLimitError(
        `Rate limit exceeded for OpenAI`,
        'openai',
        retryAfter
      );
    }

    if (error.status) {
      throw new LLMAPIError(
        error.message || `API error from OpenAI`,
        error.status,
        'openai',
        error
      );
    }

    throw new LLMError(
      error.message || `Unknown error from OpenAI`,
      'UNKNOWN_ERROR',
      'openai',
      undefined,
      error
    );
  }

  /**
   * Generate a text completion (non-streaming)
   */
  async generateCompletion(request: LLMCompletionRequest): Promise<LLMCompletionResponse> {
    await this.ensureInitialized();

    try {
      const model = this.provider(request.model.model, {
        apiKey: this.config.apiKey,
        baseURL: this.config.baseURL,
        organization: this.config.organization,
      });
      const messages = this.convertMessages(request.messages);

      const result = await generateText({
        model,
        messages,
        maxTokens: request.model.maxTokens,
        temperature: request.model.temperature,
        topP: request.model.topP,
        frequencyPenalty: request.model.frequencyPenalty,
        presencePenalty: request.model.presencePenalty,
        stopSequences: request.model.stop,
      });

      return {
        content: result.text,
        finishReason: result.finishReason as any,
        usage: result.usage ? {
          promptTokens: result.usage.promptTokens,
          completionTokens: result.usage.completionTokens,
          totalTokens: result.usage.totalTokens,
        } : undefined,
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Generate a streaming text completion
   */
  async *generateStreamingCompletion(
    request: LLMCompletionRequest
  ): AsyncIterable<LLMStreamChunk> {
    await this.ensureInitialized();

    try {
      const model = this.provider(request.model.model, {
        apiKey: this.config.apiKey,
        baseURL: this.config.baseURL,
        organization: this.config.organization,
      });
      const messages = this.convertMessages(request.messages);

      const result = await streamText({
        model,
        messages,
        maxTokens: request.model.maxTokens,
        temperature: request.model.temperature,
        topP: request.model.topP,
        frequencyPenalty: request.model.frequencyPenalty,
        presencePenalty: request.model.presencePenalty,
        stopSequences: request.model.stop,
      });

      for await (const chunk of result.textStream) {
        yield {
          content: chunk,
          isComplete: false,
        };
      }

      // Final chunk with completion info
      const finalResult = await result.finishReason;
      yield {
        content: '',
        isComplete: true,
        finishReason: finalResult as any,
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Generate structured output using a schema
   */
  async generateStructuredOutput<T>(
    request: LLMCompletionRequest,
    schema: any, // Zod schema or JSON schema
    description?: string
  ): Promise<T> {
    await this.ensureInitialized();

    try {
      const model = this.provider(request.model.model, {
        apiKey: this.config.apiKey,
        baseURL: this.config.baseURL,
        organization: this.config.organization,
      });
      const messages = this.convertMessages(request.messages);

      const result = await generateObject({
        model,
        messages,
        schema,
        schemaName: description,
        maxTokens: request.model.maxTokens,
        temperature: request.model.temperature,
        topP: request.model.topP,
        frequencyPenalty: request.model.frequencyPenalty,
        presencePenalty: request.model.presencePenalty,
      });

      return result.object as T;
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Create a simple text completion with minimal configuration
   */
  async simpleCompletion(
    prompt: string,
    options?: {
      model?: string;
      maxTokens?: number;
      temperature?: number;
    }
  ): Promise<string> {
    const model = options?.model || this.config.defaultModel || 'gpt-4';
    
    const modelConfig: LLMModelConfig = {
      provider: 'openai',
      model,
      ...this.config.defaultModelConfig,
      // Override with specific options (these take precedence)
      ...(options?.maxTokens !== undefined && { maxTokens: options.maxTokens }),
      ...(options?.temperature !== undefined && { temperature: options.temperature }),
    };

    const request: LLMCompletionRequest = {
      messages: [{ role: 'user', content: prompt }],
      model: modelConfig,
    };

    const response = await this.generateCompletion(request);
    return response.content;
  }

  /**
   * Generate embedding for a single text
   */
  async embed(request: LLMEmbedRequest): Promise<LLMEmbedResponse> {
    await this.ensureInitialized();

    try {
      const model = this.provider(
        request.model || this.config.defaultEmbeddingModel || 'text-embedding-3-small',
        {
          apiKey: this.config.apiKey,
          baseURL: this.config.baseURL,
          organization: this.config.organization,
        }
      );

      const result = await embed({
        model,
        value: request.text,
      });

      return {
        embedding: result.embedding,
        usage: result.usage ? {
          tokens: result.usage.tokens,
        } : undefined,
        metadata: request.metadata,
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Generate embeddings for multiple texts
   */
  async embedMany(request: LLMEmbedManyRequest): Promise<LLMEmbedManyResponse> {
    await this.ensureInitialized();

    try {
      const model = this.provider(
        request.model || this.config.defaultEmbeddingModel || 'text-embedding-3-small',
        {
          apiKey: this.config.apiKey,
          baseURL: this.config.baseURL,
          organization: this.config.organization,
        }
      );

      const result = await embedMany({
        model,
        values: request.texts,
      });

      return {
        embeddings: result.embeddings,
        usage: result.usage ? {
          tokens: result.usage.tokens,
        } : undefined,
        metadata: request.metadata,
      };
    } catch (error) {
      this.handleError(error);
    }
  }

  /**
   * Simple embedding for a single text with minimal configuration
   */
  async simpleEmbed(
    text: string,
    options?: {
      model?: string;
    }
  ): Promise<number[]> {
    const request: LLMEmbedRequest = {
      text,
      model: options?.model,
    };

    const response = await this.embed(request);
    return response.embedding;
  }

  /**
   * Simple embeddings for multiple texts with minimal configuration
   */
  async simpleEmbedMany(
    texts: string[],
    options?: {
      model?: string;
    }
  ): Promise<number[][]> {
    const request: LLMEmbedManyRequest = {
      texts,
      model: options?.model,
    };

    const response = await this.embedMany(request);
    return response.embeddings;
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<LLMServiceConfig>): void {
    this.config = { ...this.config, ...config };
    this.provider = null;
    this.initPromise = null;
  }

  /**
   * Get current configuration (without sensitive data)
   */
  getConfig(): Omit<LLMServiceConfig, 'apiKey'> {
    const { apiKey, ...safeConfig } = this.config;
    return safeConfig;
  }

  /**
   * Dispose of the service
   */
  async dispose(): Promise<void> {
    this.provider = null;
    this.initPromise = null;
    LLMService.instance = null;
  }
}

/**
 * Create an LLM service instance from environment variables
 */
export function createLLMServiceFromEnv(): LLMService {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AZURE_OPENAI_API_KEY;
  
  if (!apiKey) {
    throw new LLMConfigError('No OpenAI API key found in environment variables (OPENAI_API_KEY or AZURE_OPENAI_API_KEY)');
  }

  const config: LLMServiceConfig = {
    apiKey,
    baseURL: process.env.OPENAI_BASE_URL || process.env.AZURE_OPENAI_ENDPOINT,
    defaultModel: process.env.OPENAI_DEFAULT_MODEL || process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4.1',
    defaultEmbeddingModel: process.env.OPENAI_EMBEDDING_MODEL || process.env.AZURE_OPENAI_EMBEDDING_DEPLOYMENT || 'text-embedding-3-small',
    organization: process.env.OPENAI_ORGANIZATION,
    apiVersion: process.env.AZURE_OPENAI_API_VERSION,
    defaultModelConfig: {
      maxTokens: process.env.LLM_MAX_TOKENS ? parseInt(process.env.LLM_MAX_TOKENS) : 1000,
      temperature: process.env.LLM_TEMPERATURE ? parseFloat(process.env.LLM_TEMPERATURE) : 0.3,
    },
  };

  return new LLMService(config);
}

/**
 * Get or create the global LLM service instance
 */
export function getLLMService(): LLMService {
  try {
    return LLMService.getInstance();
  } catch {
    // If no instance exists, create from environment
    const service = createLLMServiceFromEnv();
    return LLMService.getInstance(service.getConfig() as LLMServiceConfig);
  }
}