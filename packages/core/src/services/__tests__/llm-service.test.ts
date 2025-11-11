import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LLMService, createLLMServiceFromEnv } from '../llm-service.js';
import type { LLMServiceConfig } from '../llm-service.js';

// Mock the AI SDK modules
vi.mock('ai', () => ({
  generateText: vi.fn(),
  streamText: vi.fn(),
  generateObject: vi.fn(),
  embed: vi.fn(),
  embedMany: vi.fn(),
}));

vi.mock('@ai-sdk/openai', () => ({
  openai: vi.fn(),
}));

describe('LLMService', () => {
  let service: LLMService;
  let mockConfig: LLMServiceConfig;

  beforeEach(() => {
    // Reset singleton
    (LLMService as any).instance = null;

    mockConfig = {
      apiKey: 'test-api-key',
      baseURL: 'https://api.openai.com/v1',
      defaultModel: 'gpt-4',
      defaultEmbeddingModel: 'text-embedding-3-small',
      organization: 'test-org',
      defaultModelConfig: {
        maxTokens: 1000,
        temperature: 0.7,
      },
    };

    service = new LLMService(mockConfig);
  });

  describe('getInstance', () => {
    it('should create a singleton instance', () => {
      const instance1 = LLMService.getInstance(mockConfig);
      const instance2 = LLMService.getInstance();

      expect(instance1).toBe(instance2);
    });

    it('should throw error if no config provided on first call', () => {
      expect(() => LLMService.getInstance()).toThrow(
        'LLMService requires configuration on first initialization',
      );
    });
  });

  describe('configuration', () => {
    it('should update configuration', () => {
      const newConfig = { defaultModel: 'gpt-3.5-turbo' };
      service.updateConfig(newConfig);

      const config = service.getConfig();
      expect(config.defaultModel).toBe('gpt-3.5-turbo');
    });

    it('should not expose API key in getConfig', () => {
      const config = service.getConfig();
      expect(config).not.toHaveProperty('apiKey');
    });
  });

  describe('createLLMServiceFromEnv', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      vi.clearAllMocks();
      process.env = { ...originalEnv };
    });

    afterEach(() => {
      process.env = originalEnv;
    });

    it('should create service from OpenAI environment variables', () => {
      process.env.OPENAI_API_KEY = 'test-openai-key';
      process.env.OPENAI_DEFAULT_MODEL = 'gpt-4';
      process.env.LLM_MAX_TOKENS = '2000';
      process.env.LLM_TEMPERATURE = '0.5';

      const service = createLLMServiceFromEnv();
      const config = service.getConfig();

      expect(config.defaultModel).toBe('gpt-4');
      expect(config.defaultModelConfig?.maxTokens).toBe(2000);
      expect(config.defaultModelConfig?.temperature).toBe(0.5);
    });

    it('should create service from Azure OpenAI environment variables', () => {
      process.env.AZURE_OPENAI_API_KEY = 'test-azure-key';
      process.env.AZURE_OPENAI_ENDPOINT = 'https://test.openai.azure.com';
      process.env.AZURE_OPENAI_DEPLOYMENT_NAME = 'gpt-4-deployment';
      process.env.AZURE_OPENAI_API_VERSION = '2023-12-01-preview';

      const service = createLLMServiceFromEnv();
      const config = service.getConfig();

      expect(config.baseURL).toBe('https://test.openai.azure.com');
      expect(config.defaultModel).toBe('gpt-4-deployment');
      expect(config.apiVersion).toBe('2023-12-01-preview');
    });

    it('should throw error if no API key is provided', () => {
      delete process.env.OPENAI_API_KEY;
      delete process.env.AZURE_OPENAI_API_KEY;

      expect(() => createLLMServiceFromEnv()).toThrow(
        'No OpenAI API key found in environment variables',
      );
    });
  });

  describe('simpleCompletion', () => {
    it('should use default model when none specified', async () => {
      const mockGenerateCompletion = vi.spyOn(service, 'generateCompletion').mockResolvedValue({
        content: 'Test response',
        finishReason: 'stop',
      });

      const result = await service.simpleCompletion('Test prompt');

      expect(result).toBe('Test response');
      expect(mockGenerateCompletion).toHaveBeenCalledWith({
        messages: [{ role: 'user', content: 'Test prompt' }],
        model: expect.objectContaining({
          provider: 'openai',
          model: 'gpt-4',
          maxTokens: 1000,
          temperature: 0.7,
        }),
      });
    });

    it('should use provided options', async () => {
      const mockGenerateCompletion = vi.spyOn(service, 'generateCompletion').mockResolvedValue({
        content: 'Test response',
        finishReason: 'stop',
      });

      await service.simpleCompletion('Test prompt', {
        model: 'gpt-3.5-turbo',
        maxTokens: 500,
        temperature: 0.5,
      });

      expect(mockGenerateCompletion).toHaveBeenCalledWith({
        messages: [{ role: 'user', content: 'Test prompt' }],
        model: expect.objectContaining({
          model: 'gpt-3.5-turbo',
          maxTokens: 500,
          temperature: 0.5,
        }),
      });
    });
  });

  describe('embedding', () => {
    it('should generate single embedding', async () => {
      const mockEmbed = vi.spyOn(service, 'embed').mockResolvedValue({
        embedding: [0.1, 0.2, 0.3],
        usage: { tokens: 10 },
      });

      const result = await service.simpleEmbed('Test text for embedding');

      expect(result).toEqual([0.1, 0.2, 0.3]);
      expect(mockEmbed).toHaveBeenCalledWith({
        text: 'Test text for embedding',
        model: undefined,
      });
    });

    it('should generate multiple embeddings', async () => {
      const mockEmbedMany = vi.spyOn(service, 'embedMany').mockResolvedValue({
        embeddings: [
          [0.1, 0.2],
          [0.3, 0.4],
        ],
        usage: { tokens: 20 },
      });

      const result = await service.simpleEmbedMany(['Text 1', 'Text 2']);

      expect(result).toEqual([
        [0.1, 0.2],
        [0.3, 0.4],
      ]);
      expect(mockEmbedMany).toHaveBeenCalledWith({
        texts: ['Text 1', 'Text 2'],
        model: undefined,
      });
    });

    it('should use custom embedding model', async () => {
      const mockEmbed = vi.spyOn(service, 'embed').mockResolvedValue({
        embedding: [0.5, 0.6, 0.7],
        usage: { tokens: 15 },
      });

      await service.simpleEmbed('Test text', { model: 'text-embedding-3-large' });

      expect(mockEmbed).toHaveBeenCalledWith({
        text: 'Test text',
        model: 'text-embedding-3-large',
      });
    });
  });

  describe('dispose', () => {
    it('should clean up resources', async () => {
      const instance = LLMService.getInstance(mockConfig);
      await instance.dispose();

      // After dispose, getInstance should require config again
      expect(() => LLMService.getInstance()).toThrow(
        'LLMService requires configuration on first initialization',
      );
    });
  });
});
