/**
 * File export utilities for downloading schemas as JSON files
 */

/**
 * Download a JSON object as a file
 * @param data - The data to download (will be stringified)
 * @param filename - The filename for the downloaded file
 * @param pretty - Whether to format JSON with indentation (default: true)
 */
export function downloadJsonFile(
  data: unknown,
  filename: string,
  pretty: boolean = true
): void {
  const json = JSON.stringify(data, null, pretty ? 2 : 0);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Generate a filename with timestamp
 * @param prefix - The prefix for the filename (e.g., "schema", "ui-schema")
 * @param extension - The file extension (default: "json")
 * @returns A filename like "schema-2024-01-15-103045.json"
 */
export function generateFilename(
  prefix: string,
  extension: string = 'json'
): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const seconds = String(now.getSeconds()).padStart(2, '0');
  
  return `${prefix}-${year}-${month}-${day}-${hours}${minutes}${seconds}.${extension}`;
}

/**
 * Export combined schema (JSON Schema + UI Schema + optional form data)
 * @param schema - The JSON Schema
 * @param uiSchema - The UI Schema
 * @param formData - Optional form data to include
 * @param filename - Optional custom filename (default: auto-generated)
 */
export function exportCombinedSchema(
  schema: unknown,
  uiSchema: unknown,
  formData?: unknown,
  filename?: string
): void {
  const exportData: Record<string, unknown> = {
    schema,
    uiSchema,
    metadata: {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
    },
  };

  if (formData) {
    exportData.formData = formData;
  }

  const finalFilename = filename || generateFilename('schema-export');
  downloadJsonFile(exportData, finalFilename);
}

