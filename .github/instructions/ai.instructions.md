---
applyTo: 'packages/ai/src/**/*.ts'
---

# AI Package Development Guidelines

## 📦 Import System Requirements

### ESM Import Patterns for AI Package
- **ALWAYS use .js extensions** for all internal imports
- **Use relative imports** for intra-package references
- **Use @devlog/* aliases** for core package dependencies
- **Standard npm imports** for external AI/ML libraries

### AI-Specific Import Examples
```typescript
// ✅ Internal AI package imports with .js extensions
import { AIAssistantParser } from './base/ai-assistant-parser.js';
import { ChatStatistics } from '../models/index.js';
import type { SearchResult } from '../types/index.js';

// ✅ Cross-package imports
import { DevlogEntry } from '@devlog/core';
import type { StorageProvider } from '@devlog/core/storage';

// ✅ External AI/ML libraries
import { ChatOpenAI } from '@langchain/openai';
import type { Message } from '@langchain/core/messages';

// ❌ Avoid: Self-referencing aliases or missing extensions
import { ChatStatistics } from '@/models';        // Ambiguous
import { AIAssistantParser } from './base/ai-assistant-parser';  // Missing .js
import type { SearchResult } from '../types';     // Missing index.js
```

## 🤖 AI Architecture Requirements

### Parser Implementation Patterns
- **Extend base parser classes** for consistent interfaces
- **Handle multiple file formats** (JSON, markdown, etc.)
- **Implement proper error handling** for malformed data
- **Support streaming data processing** for large files

### Model Integration Standards
```typescript
// Model interface template
export interface AIModel {
  id: string;
  name: string;
  provider: string;
  configuration: ModelConfiguration;
}

// Parser base class pattern
export abstract class BaseParser<TInput, TOutput> {
  abstract parse(input: TInput): Promise<TOutput>;
  abstract validate(input: TInput): boolean;
  
  protected handleError(error: Error, context: string): never {
    throw new AIParsingError(`${context}: ${error.message}`, { cause: error });
  }
}
```

### Export Organization
- **Export parsers** from parsers/index.ts
- **Export models** from models/index.ts
- **Export utilities** from utils/index.ts
- **Main package exports** only essential public APIs

## 🔍 Data Processing Guidelines

### File Format Support
- **JSON parsing**: Handle malformed JSON gracefully
- **Markdown extraction**: Preserve formatting and metadata
- **CSV processing**: Support various delimiters and encodings
- **Binary formats**: Use appropriate streaming for large files

### Error Handling Patterns
```typescript
// Specific error types
export class AIParsingError extends Error {
  constructor(message: string, public readonly context?: any) {
    super(message);
    this.name = 'AIParsingError';
  }
}

// Result pattern for operations that can fail
export type ParseResult<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: AIParsingError;
};
```

### Performance Considerations
- **Stream large files** instead of loading into memory
- **Use worker threads** for CPU-intensive processing
- **Implement caching** for frequently accessed models
- **Batch operations** when processing multiple items

## 🧪 Testing Requirements

### Parser Testing Patterns
```typescript
describe('CopilotParser', () => {
  let parser: CopilotParser;
  
  beforeEach(() => {
    parser = new CopilotParser({ enableValidation: true });
  });
  
  describe('parse()', () => {
    it('should parse valid copilot chat data', async () => {
      const input = await readTestFile('valid-chat.json');
      const result = await parser.parse(input);
      
      expect(result.sessions).toHaveLength(2);
      expect(result.sessions[0].messages).toBeDefined();
    });
    
    it('should handle malformed JSON gracefully', async () => {
      const input = '{ "invalid": json }';
      
      await expect(parser.parse(input)).rejects.toThrow(AIParsingError);
    });
  });
});
```

### Model Testing Standards
- **Mock external AI services** for unit tests
- **Test with sample data** that represents real usage
- **Validate error handling** for various failure modes
- **Performance benchmarks** for large data processing

## 🚨 Critical Requirements

### MUST DO
- ✅ Use .js extensions for all internal imports
- ✅ Implement proper error handling with specific error types
- ✅ Support streaming for large file processing
- ✅ Export clean public APIs from package index
- ✅ Include comprehensive JSDoc for public methods

### MUST NOT DO
- ❌ Use @/ self-referencing aliases within AI package
- ❌ Load large files entirely into memory
- ❌ Expose internal implementation details in exports
- ❌ Ignore parsing errors or fail silently
- ❌ Create circular dependencies between parsers

## 🎯 Quality Standards

### Code Organization
- **Parser Separation**: One parser per data source/format
- **Model Abstraction**: Clean interfaces for AI model integration
- **Utility Functions**: Pure functions for data transformation
- **Type Safety**: Comprehensive TypeScript types for all data structures

### Documentation Standards
- **Parser Usage**: Clear examples for each supported format
- **Model Integration**: How to add new AI model providers
- **Performance Notes**: Memory and processing considerations
- **Error Scenarios**: Common failure modes and handling strategies
