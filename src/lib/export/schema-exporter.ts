import type { RJSFSchema } from "@rjsf/utils";
import type { SchemaGraph } from '../graph/schema-graph';
import type { NestedUiSchema } from '../store/ui-schema';
import { compileToJsonSchema } from '../graph/schema-compiler';
import { generateUiSchema } from '../ui-schema/ui-schema-generator';

/**
 * Export result containing both JSON Schema and UI Schema
 */
export interface SchemaExport {
  schema: RJSFSchema;
  uiSchema: NestedUiSchema;
}

/**
 * Export schema and UI schema from a SchemaGraph
 * 
 * @param graph - The schema graph to export
 * @returns Object containing both JSON schema and UI schema
 */
export function exportSchemaAndUiSchema(graph: SchemaGraph): SchemaExport {
  return {
    schema: compileToJsonSchema(graph),
    uiSchema: generateUiSchema(graph),
  };
}

/**
 * Export schema and UI schema as formatted JSON string
 * 
 * @param graph - The schema graph to export
 * @param pretty - Whether to format with indentation (default: true)
 * @returns Formatted JSON string
 */
export function exportSchemaAsJson(
  graph: SchemaGraph,
  pretty: boolean = true
): string {
  const exportData = exportSchemaAndUiSchema(graph);
  return JSON.stringify(exportData, null, pretty ? 2 : 0);
}

/**
 * Export only the JSON schema
 */
export function exportSchemaOnly(graph: SchemaGraph): RJSFSchema {
  return compileToJsonSchema(graph);
}

/**
 * Export only the UI schema
 */
export function exportUiSchemaOnly(graph: SchemaGraph): NestedUiSchema {
  return generateUiSchema(graph);
}

