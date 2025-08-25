/**
 * Types for LLM (Large Language Model) utilities and configurations
 */

/**
 * Supported LLM providers
 */
export type LLMProvider = 'openai' | 'anthropic' | 'google' | 'cohere' | 'mistral';

/**
 * LLM model configuration
 */
export interface LLMModelConfig {
  /** The model identifier (e.g., "gpt-4", "claude-3-sonnet") */
  model: string;
  /** Provider name */
  provider: LLMProvider;
  /** Maximum tokens for the response */
  maxTokens?: number;
  /** Temperature for response randomness (0-1) */
  temperature?: number;
  /** Top-p sampling parameter */
  topP?: number;
  /** Frequency penalty (-2 to 2) */
  frequencyPenalty?: number;
  /** Presence penalty (-2 to 2) */
  presencePenalty?: number;
  /** Stop sequences */
  stop?: string[];
}

/**
 * Message role types
 */
export type MessageRole = 'system' | 'user' | 'assistant' | 'function' | 'tool';

/**
 * Message content types
 */
export interface LLMMessage {
  /** Role of the message sender */
  role: MessageRole;
  /** Content of the message */
  content: string;
  /** Optional message name/identifier */
  name?: string;
  /** Optional function call data */
  function_call?: {
    name: string;
    arguments: string;
  };
  /** Optional tool calls */
  tool_calls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

/**
 * LLM completion request options
 */
export interface LLMCompletionRequest {
  /** Array of messages for the conversation */
  messages: LLMMessage[];
  /** Model configuration */
  model: LLMModelConfig;
  /** Whether to stream the response */
  stream?: boolean;
  /** Optional metadata for the request */
  metadata?: Record<string, unknown>;
  /** Optional tools/functions available to the model */
  tools?: Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: Record<string, unknown>;
    };
  }>;
}

/**
 * LLM completion response (non-streaming)
 */
export interface LLMCompletionResponse {
  /** Generated content */
  content: string;
  /** Finish reason */
  finishReason: 'stop' | 'length' | 'content_filter' | 'tool_calls' | 'function_call';
  /** Usage statistics */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  /** Response metadata */
  metadata?: Record<string, unknown>;
  /** Function calls made by the model */
  functionCalls?: Array<{
    name: string;
    arguments: string;
  }>;
  /** Tool calls made by the model */
  toolCalls?: Array<{
    id: string;
    type: 'function';
    function: {
      name: string;
      arguments: string;
    };
  }>;
}

/**
 * LLM streaming chunk
 */
export interface LLMStreamChunk {
  /** Content delta for this chunk */
  content?: string;
  /** Whether this is the final chunk */
  isComplete: boolean;
  /** Finish reason (only present in final chunk) */
  finishReason?: 'stop' | 'length' | 'content_filter' | 'tool_calls' | 'function_call';
  /** Function call delta */
  functionCall?: {
    name?: string;
    arguments?: string;
  };
  /** Tool call deltas */
  toolCalls?: Array<{
    id?: string;
    type?: 'function';
    function?: {
      name?: string;
      arguments?: string;
    };
  }>;
}

/**
 * LLM configuration for different providers
 */
export interface LLMConfig {
  /** Default provider to use */
  defaultProvider: LLMProvider;
  /** Provider-specific configurations */
  providers: {
    openai?: {
      apiKey: string;
      baseURL?: string;
      defaultModel?: string;
    };
    anthropic?: {
      apiKey: string;
      baseURL?: string;
      defaultModel?: string;
    };
    google?: {
      apiKey: string;
      baseURL?: string;
      defaultModel?: string;
    };
    cohere?: {
      apiKey: string;
      baseURL?: string;
      defaultModel?: string;
    };
    mistral?: {
      apiKey: string;
      baseURL?: string;
      defaultModel?: string;
    };
  };
  /** Default model configuration */
  defaultModelConfig?: Partial<LLMModelConfig>;
}

/**
 * LLM error types
 */
export class LLMError extends Error {
  constructor(
    message: string,
    public code?: string,
    public provider?: LLMProvider,
    public statusCode?: number,
    public cause?: Error
  ) {
    super(message);
    this.name = 'LLMError';
  }
}

/**
 * LLM configuration error
 */
export class LLMConfigError extends LLMError {
  constructor(message: string, provider?: LLMProvider) {
    super(message, 'CONFIG_ERROR', provider);
    this.name = 'LLMConfigError';
  }
}

/**
 * LLM API error
 */
export class LLMAPIError extends LLMError {
  constructor(
    message: string,
    statusCode: number,
    provider: LLMProvider,
    cause?: Error
  ) {
    super(message, 'API_ERROR', provider, statusCode, cause);
    this.name = 'LLMAPIError';
  }
}

/**
 * LLM rate limit error
 */
export class LLMRateLimitError extends LLMError {
  constructor(
    message: string,
    provider: LLMProvider,
    retryAfter?: number
  ) {
    super(message, 'RATE_LIMIT', provider);
    this.name = 'LLMRateLimitError';
    if (retryAfter) {
      this.metadata = { retryAfter };
    }
  }

  public metadata?: { retryAfter: number };
}

/**
 * Embedding request for a single text
 */
export interface LLMEmbedRequest {
  /** Text to embed */
  text: string;
  /** Model to use for embedding */
  model?: string;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Embedding request for multiple texts
 */
export interface LLMEmbedManyRequest {
  /** Array of texts to embed */
  texts: string[];
  /** Model to use for embedding */
  model?: string;
  /** Optional metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Embedding response for a single text
 */
export interface LLMEmbedResponse {
  /** The embedding vector */
  embedding: number[];
  /** Usage statistics */
  usage?: {
    tokens: number;
  };
  /** Response metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Embedding response for multiple texts
 */
export interface LLMEmbedManyResponse {
  /** Array of embedding vectors */
  embeddings: number[][];
  /** Usage statistics */
  usage?: {
    tokens: number;
  };
  /** Response metadata */
  metadata?: Record<string, unknown>;
}