/**
 * Document service tests
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { PrismaDocumentService as DocumentService } from '../documents/prisma-document-service.js';
import type { DevlogDocument } from '../../types/index.js';

// Mock data for testing
const mockFile = {
  originalName: 'test-document.txt',
  mimeType: 'text/plain',
  size: 1024,
  content: Buffer.from('This is a test document content', 'utf-8'),
};

const mockDevlogId = 1;

describe('DocumentService', () => {
  // Note: Database tests are skipped due to enum column compatibility issues with SQLite
  // These tests focus on the business logic and type detection functionality

  describe('Document Type Detection', () => {
    it('should detect text documents correctly', () => {
      const service = DocumentService.getInstance();
      
      // Access private method through any to test it
      const detectType = (service as any).determineDocumentType.bind(service);
      
      expect(detectType('text/plain', '.txt')).toBe('text');
      expect(detectType('text/markdown', '.md')).toBe('markdown');
      expect(detectType('application/json', '.json')).toBe('json');
      expect(detectType('text/csv', '.csv')).toBe('csv');
    });

    it('should detect code documents correctly', () => {
      const service = DocumentService.getInstance();
      const detectType = (service as any).determineDocumentType.bind(service);
      
      expect(detectType('text/plain', '.js')).toBe('code');
      expect(detectType('text/plain', '.ts')).toBe('code');
      expect(detectType('text/plain', '.py')).toBe('code');
      expect(detectType('text/plain', '.java')).toBe('code');
    });

    it('should detect images correctly', () => {
      const service = DocumentService.getInstance();
      const detectType = (service as any).determineDocumentType.bind(service);
      
      expect(detectType('image/png', '.png')).toBe('image');
      expect(detectType('image/jpeg', '.jpg')).toBe('image');
      expect(detectType('image/gif', '.gif')).toBe('image');
    });

    it('should detect PDFs correctly', () => {
      const service = DocumentService.getInstance();
      const detectType = (service as any).determineDocumentType.bind(service);
      
      expect(detectType('application/pdf', '.pdf')).toBe('pdf');
    });

    it('should default to other for unknown types', () => {
      const service = DocumentService.getInstance();
      const detectType = (service as any).determineDocumentType.bind(service);
      
      expect(detectType('application/unknown', '.xyz')).toBe('other');
    });
  });

  describe('Text Content Extraction', () => {
    it('should identify text-based types correctly', () => {
      const service = DocumentService.getInstance();
      const isTextBased = (service as any).isTextBasedType.bind(service);
      
      expect(isTextBased('text')).toBe(true);
      expect(isTextBased('markdown')).toBe(true);
      expect(isTextBased('code')).toBe(true);
      expect(isTextBased('json')).toBe(true);
      expect(isTextBased('csv')).toBe(true);
      expect(isTextBased('log')).toBe(true);
      expect(isTextBased('config')).toBe(true);
      
      expect(isTextBased('image')).toBe(false);
      expect(isTextBased('pdf')).toBe(false);
      expect(isTextBased('other')).toBe(false);
    });

    it('should extract text content from strings and buffers', () => {
      const service = DocumentService.getInstance();
      const extractText = (service as any).extractTextContent.bind(service);
      
      const textContent = 'Hello, World!';
      const bufferContent = Buffer.from(textContent, 'utf-8');
      
      expect(extractText(textContent, 'text')).toBe(textContent);
      expect(extractText(bufferContent, 'text')).toBe(textContent);
      expect(extractText(bufferContent, 'image')).toBe('');
    });
  });

  // Note: More comprehensive integration tests would require a test database
  // These tests focus on the business logic and type detection functionality
});