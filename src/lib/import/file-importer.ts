/**
 * File import utilities for reading JSON files
 */

/**
 * Read a JSON file and parse it
 * @param file - The file to read
 * @returns Promise that resolves to the parsed JSON object
 * @throws Error if file cannot be read or JSON is invalid
 */
export function readJsonFile(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    // Check file size (warn if > 10MB)
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
    if (file.size > MAX_FILE_SIZE) {
      reject(new Error(`File is too large (${(file.size / 1024 / 1024).toFixed(2)}MB). Maximum size is 10MB.`));
      return;
    }

    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        if (!text) {
          reject(new Error('File is empty'));
          return;
        }
        const json = JSON.parse(text);
        resolve(json);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Invalid JSON';
        reject(new Error(`Failed to parse JSON: ${message}`));
      }
    };
    
    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };
    
    reader.readAsText(file);
  });
}

/**
 * Create a file input element and trigger file selection
 * @param accept - File types to accept (default: ".json")
 * @param multiple - Whether to allow multiple files (default: false)
 * @returns Promise that resolves to the selected file(s)
 */
export function selectJsonFile(
  accept: string = '.json',
  multiple: boolean = false
): Promise<File[]> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = accept;
    input.multiple = multiple;
    
    input.onchange = (e) => {
      const files = (e.target as HTMLInputElement).files;
      if (!files || files.length === 0) {
        reject(new Error('No file selected'));
        return;
      }
      resolve(Array.from(files));
    };
    
    input.oncancel = () => {
      reject(new Error('File selection cancelled'));
    };
    
    input.click();
  });
}

/**
 * Read and parse a JSON file from file selection
 * @returns Promise that resolves to the parsed JSON object
 */
export async function importJsonFile(): Promise<unknown> {
  const files = await selectJsonFile();
  if (files.length === 0) {
    throw new Error('No file selected');
  }
  return readJsonFile(files[0]);
}

