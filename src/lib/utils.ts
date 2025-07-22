import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { type SchemaGraph } from "./graph/schema-graph-engine";

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
  let currentId = nodeId;
  const visited = new Set<string>(); // Prevent infinite loops

  while (currentId && currentId !== 'root') {
    // Check for circular references
    if (visited.has(currentId)) {
      break;
    }
    visited.add(currentId);

    const currentNode = graph.nodes[currentId];
    if (!currentNode) break;

    parts.unshift(currentNode.key);
    currentId = currentNode.parentId || 'root';
  }

  return parts.join('.');
}
