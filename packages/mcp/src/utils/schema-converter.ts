/**
 * Zod to JSON Schema converter for MCP tools
 *
 * This module converts Zod schemas to JSON Schema format
 * required by MCP tool definitions.
 */

import { z } from 'zod';

/**
 * Convert a Zod schema to JSON Schema format for MCP tool inputSchema
 */
export function zodToJsonSchema(schema: z.ZodSchema<any>): any {
  return zodToJsonSchemaRecursive(schema._def);
}

function zodToJsonSchemaRecursive(def: any): any {
  switch (def.typeName) {
    case 'ZodString':
      const stringSchema: any = { type: 'string' };

      // Handle string validations
      if (def.checks) {
        for (const check of def.checks) {
          switch (check.kind) {
            case 'min':
              stringSchema.minLength = check.value;
              break;
            case 'max':
              stringSchema.maxLength = check.value;
              break;
            case 'regex':
              stringSchema.pattern = check.regex.source;
              break;
          }
        }
      }

      return stringSchema;

    case 'ZodNumber':
      const numberSchema: any = { type: 'number' };

      // Handle number validations
      if (def.checks) {
        for (const check of def.checks) {
          switch (check.kind) {
            case 'min':
              numberSchema.minimum = check.value;
              break;
            case 'max':
              numberSchema.maximum = check.value;
              break;
            case 'int':
              numberSchema.type = 'integer';
              break;
          }
        }
      }

      return numberSchema;

    case 'ZodBoolean':
      return { type: 'boolean' };

    case 'ZodEnum':
      return {
        type: 'string',
        enum: def.values,
      };

    case 'ZodArray':
      return {
        type: 'array',
        items: zodToJsonSchemaRecursive(def.type._def),
      };

    case 'ZodObject':
      const properties: any = {};
      const required: string[] = [];

      for (const [key, value] of Object.entries(def.shape())) {
        const fieldDef = (value as any)._def;
        properties[key] = zodToJsonSchemaRecursive(fieldDef);

        // Check if field is optional
        if (fieldDef.typeName !== 'ZodOptional' && fieldDef.typeName !== 'ZodDefault') {
          required.push(key);
        }
      }

      const objectSchema: any = {
        type: 'object',
        properties,
      };

      if (required.length > 0) {
        objectSchema.required = required;
      }

      return objectSchema;

    case 'ZodOptional':
      return zodToJsonSchemaRecursive(def.innerType._def);

    case 'ZodDefault':
      const defaultSchema = zodToJsonSchemaRecursive(def.innerType._def);
      defaultSchema.default = def.defaultValue();
      return defaultSchema;

    case 'ZodTransform':
      // For transforms, just use the input schema
      return zodToJsonSchemaRecursive(def.schema._def);

    case 'ZodEffects':
      // For effects (including transforms), use the underlying schema
      return zodToJsonSchemaRecursive(def.schema._def);

    case 'ZodNullable':
      // Handle nullable types
      const nullableSchema = zodToJsonSchemaRecursive(def.innerType._def);
      if (Array.isArray(nullableSchema.type)) {
        nullableSchema.type.push('null');
      } else {
        nullableSchema.type = [nullableSchema.type, 'null'];
      }
      return nullableSchema;

    default:
      // Fallback for unsupported types
      console.warn(`Unsupported Zod type: ${def.typeName}, falling back to any`);
      return {};
  }
}
