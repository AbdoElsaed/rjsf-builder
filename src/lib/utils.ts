import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { type SchemaGraph, type SchemaNode, getChildren } from "./graph/schema-graph";
import { getParent } from "./graph/schema-graph";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Gets the full path of a node in the schema graph
 * @param graph The schema graph
 * @param nodeId The ID of the node to get the path for
 * @returns The full path of the node (e.g. "person.address.street")
 */
export function getNodePath(graph: SchemaGraph, nodeId: string): string {
  const parts: string[] = [];
  let currentId: string | null = nodeId;
  const visited = new Set<string>(); // Prevent infinite loops

  while (currentId && currentId !== 'root') {
    // Check for circular references
    if (visited.has(currentId)) {
      break;
    }
    visited.add(currentId);

    const currentNode = graph.nodes.get(currentId);
    if (!currentNode) break;

    parts.unshift(currentNode.key);
    const parent = getParent(graph, currentId);
    currentId = parent?.id || null;
  }

  return parts.join('.');
}

/**
 * Converts a title to a valid JSON Schema key
 * Rules:
 * - Must start with a letter or underscore
 * - Can contain letters, numbers, and underscores
 * - Converted to lowercase with underscores
 * - Special characters are replaced with underscores
 * - Multiple underscores are collapsed to one
 * - Leading/trailing underscores are removed
 * 
 * @param title The title to convert
 * @returns A valid key identifier
 */
export function titleToKey(title: string): string {
  if (!title || title.trim() === '') {
    return 'field';
  }

  // Convert to lowercase and replace non-alphanumeric with underscores
  let key = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')  // Replace non-alphanumeric with underscore
    .replace(/_+/g, '_')           // Collapse multiple underscores
    .replace(/^_|_$/g, '');        // Remove leading/trailing underscores

  // Ensure it starts with a letter or underscore (not a number)
  if (key.length === 0 || /^\d/.test(key)) {
    key = 'field_' + key;
  }

  // Ensure it's not empty
  if (key === '') {
    key = 'field';
  }

  return key;
}

/**
 * Generates a unique key for a node based on its title
 * Ensures uniqueness among siblings by appending numbers if needed
 * 
 * @param graph The schema graph
 * @param title The title to generate a key from
 * @param parentId The parent node ID (for checking siblings)
 * @param excludeNodeId Optional node ID to exclude from uniqueness check (for updates)
 * @returns A unique key that doesn't conflict with siblings
 */
export function generateUniqueKey(
  graph: SchemaGraph,
  title: string,
  parentId: string = 'root',
  excludeNodeId?: string
): string {
  const baseKey = titleToKey(title);
  
  // Get siblings to check for uniqueness
  const siblings = getChildren(graph, parentId, 'child');
  const existingKeys = new Set(
    siblings
      .filter(sibling => sibling.id !== excludeNodeId) // Exclude self if updating
      .map(sibling => sibling.key)
  );

  // If base key is unique, return it
  if (!existingKeys.has(baseKey)) {
    return baseKey;
  }

  // Otherwise, append numbers until we find a unique key
  let counter = 2;
  let candidateKey = `${baseKey}_${counter}`;
  
  while (existingKeys.has(candidateKey)) {
    counter++;
    candidateKey = `${baseKey}_${counter}`;
  }

  return candidateKey;
}
