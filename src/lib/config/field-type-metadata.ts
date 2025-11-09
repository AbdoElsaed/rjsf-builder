/**
 * Field Type Metadata and Visual Configuration
 * 
 * Provides visual metadata for each field type including icons, colors, and descriptions
 */

import type { SchemaNodeType } from "@/lib/graph/schema-graph";
import {
  Type,
  Hash,
  ToggleLeft,
  List,
  Layers,
  GitBranch,
  Bookmark,
  Link,
} from "lucide-react";

export interface FieldTypeMetadata {
  icon: typeof Type; // Lucide icon component
  color: string;     // Tailwind color class
  bgColor: string;   // Background color class
  description: string;
  category: 'data' | 'container' | 'logic' | 'reference';
}

/**
 * Visual metadata for each field type
 */
export const FIELD_TYPE_METADATA: Record<SchemaNodeType, FieldTypeMetadata> = {
  // Data fields
  string: {
    icon: Type,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 dark:bg-blue-950',
    description: 'Text input field for string values',
    category: 'data',
  },
  number: {
    icon: Hash,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 dark:bg-purple-950',
    description: 'Numeric input field for numbers',
    category: 'data',
  },
  boolean: {
    icon: ToggleLeft,
    color: 'text-green-600',
    bgColor: 'bg-green-100 dark:bg-green-950',
    description: 'Yes/No toggle or checkbox',
    category: 'data',
  },
  enum: {
    icon: List,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100 dark:bg-orange-950',
    description: 'Dropdown or radio selection',
    category: 'data',
  },

  // Container fields
  object: {
    icon: Layers,
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-100 dark:bg-cyan-950',
    description: 'Group of nested fields',
    category: 'container',
  },
  array: {
    icon: List,
    color: 'text-teal-600',
    bgColor: 'bg-teal-100 dark:bg-teal-950',
    description: 'List of items',
    category: 'container',
  },

  // Logic fields
  if_block: {
    icon: GitBranch,
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 dark:bg-amber-950',
    description: 'Conditional if-then-else logic',
    category: 'logic',
  },
  allOf: {
    icon: GitBranch,
    color: 'text-rose-600',
    bgColor: 'bg-rose-100 dark:bg-rose-950',
    description: 'All conditions must be satisfied (AND)',
    category: 'logic',
  },
  anyOf: {
    icon: GitBranch,
    color: 'text-pink-600',
    bgColor: 'bg-pink-100 dark:bg-pink-950',
    description: 'At least one condition must be satisfied (OR)',
    category: 'logic',
  },
  oneOf: {
    icon: GitBranch,
    color: 'text-fuchsia-600',
    bgColor: 'bg-fuchsia-100 dark:bg-fuchsia-950',
    description: 'Exactly one condition must be satisfied (XOR)',
    category: 'logic',
  },

  // Reference fields
  definition: {
    icon: Bookmark,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100 dark:bg-indigo-950',
    description: 'Reusable schema definition',
    category: 'reference',
  },
  ref: {
    icon: Link,
    color: 'text-violet-600',
    bgColor: 'bg-violet-100 dark:bg-violet-950',
    description: 'Reference to a definition',
    category: 'reference',
  },
};

/**
 * Get metadata for a field type
 */
export function getFieldTypeMetadata(fieldType: SchemaNodeType): FieldTypeMetadata {
  return FIELD_TYPE_METADATA[fieldType] || FIELD_TYPE_METADATA.string;
}

/**
 * Category labels and colors
 */
export const CATEGORY_CONFIG = {
  data: {
    label: 'Data Field',
    color: 'text-blue-600',
    bgColor: 'bg-blue-50 dark:bg-blue-950/30',
    description: 'Stores form input values',
  },
  container: {
    label: 'Container',
    color: 'text-cyan-600',
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/30',
    description: 'Groups other fields',
  },
  logic: {
    label: 'Logic Block',
    color: 'text-amber-600',
    bgColor: 'bg-amber-50 dark:bg-amber-950/30',
    description: 'Conditional display logic',
  },
  reference: {
    label: 'Reference',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/30',
    description: 'Reusable component',
  },
} as const;


