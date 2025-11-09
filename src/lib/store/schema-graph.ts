// Migrated to V2 - re-export everything from V2 store
export {
  useSchemaGraphStore,
  type SchemaNode as FieldNode,
  type JSONSchemaType,
} from './schema-graph-v2';

// Re-export types for backward compatibility
export type { SchemaGraph, SchemaNode } from './schema-graph-v2'; 