import type { RJSFSchema } from "@rjsf/utils";
import type { SchemaGraph, SchemaNode } from './schema-graph';
import { getChildren } from './schema-graph';

// Compilation cache to avoid recompiling unchanged graphs
const compilationCache = new WeakMap<SchemaGraph, RJSFSchema>();

function cloneSchema(schema?: RJSFSchema): RJSFSchema | undefined {
  if (!schema) {
    return undefined;
  }
  return JSON.parse(JSON.stringify(schema)) as RJSFSchema;
}

function createFailingBranchSchema(): RJSFSchema {
  return {
    not: {} as RJSFSchema,
  };
}

const OBJECT_LIKE_BRANCH_TYPES = new Set(['object', 'if_block', 'allOf', 'anyOf', 'oneOf', 'definition']);

function normalizeBranchSchema(
  graph: SchemaGraph,
  branchId: string | undefined,
  schema?: RJSFSchema
): RJSFSchema | undefined {
  if (!schema || !branchId) {
    return schema;
  }

  const branchNode = graph.nodes.get(branchId);
  if (!branchNode || OBJECT_LIKE_BRANCH_TYPES.has(branchNode.type)) {
    return schema;
  }

  if (!branchNode.key) {
    return schema;
  }

  const properties: Record<string, RJSFSchema> = {
    [branchNode.key]: schema,
  };

  const normalized: RJSFSchema = {
    type: 'object',
    properties,
  };

  if (branchNode.required) {
    normalized.required = [branchNode.key];
  }

  return normalized;
}

/**
 * Compiles SchemaGraph to JSON Schema format
 * Handles definitions, $ref, allOf/anyOf/oneOf, and nested structures
 * Optimized: Uses WeakMap cache to avoid recompiling unchanged graphs
 */
export function compileToJsonSchema(graph: SchemaGraph): RJSFSchema {
  // Check cache first
  const cached = compilationCache.get(graph);
  if (cached) {
    return cached;
  }
  
  const compiled = compileNode(graph, graph.rootId);
  
  // Collect all definitions that are referenced
  const referencedDefinitions = collectReferencedDefinitions(graph);
  
  // Build definitions section
  let result: RJSFSchema;
  if (referencedDefinitions.size > 0) {
    const definitions: Record<string, RJSFSchema> = {};
    
    referencedDefinitions.forEach((definitionName) => {
      const definitionNodeId = graph.definitions.get(definitionName);
      if (definitionNodeId) {
        const definitionNode = graph.nodes.get(definitionNodeId);
        if (definitionNode) {
          // Compile definition node (excluding definition metadata)
          const defSchema = compileDefinitionNode(graph, definitionNode);
          definitions[definitionName] = defSchema;
        }
      }
    });
    
    result = {
      ...compiled,
      definitions,
    } as RJSFSchema;
  } else {
    result = compiled;
  }
  
  // Cache the result
  compilationCache.set(graph, result);
  
  return result;
}

/**
 * Compile a single node to JSON Schema
 */
function compileNode(graph: SchemaGraph, nodeId: string): RJSFSchema {
  const node = graph.nodes.get(nodeId);
  if (!node) {
    throw new Error(`Node ${nodeId} not found`);
  }
  
  // Handle reference nodes
  if (node.type === 'ref') {
    return compileRefNode(node);
  }
  
  // Handle conditional groups
  if (node.type === 'allOf' || node.type === 'anyOf' || node.type === 'oneOf') {
    return compileConditionalGroup(graph, node);
  }
  
  // Handle definition nodes (compile their content, not the definition wrapper)
  if (node.type === 'definition') {
    return compileDefinitionNode(graph, node);
  }
  
  // Handle legacy IF blocks
  if (node.type === 'if_block') {
    return compileIfBlock(graph, node);
  }
  
  // Regular field nodes
  return compileFieldNode(graph, node);
}

/**
 * Compile a reference node to $ref format
 */
function compileRefNode(node: SchemaNode): RJSFSchema {
  if (!node.refTarget) {
    throw new Error(`Reference node ${node.id} has no refTarget`);
  }
  
  return {
    $ref: `#/definitions/${node.refTarget}`,
    title: node.title,
    description: node.description,
  } as RJSFSchema;
}

/**
 * Compile a conditional group (allOf/anyOf/oneOf)
 */
function compileConditionalGroup(
  graph: SchemaGraph,
  node: SchemaNode
): RJSFSchema {
  if (node.type !== 'allOf' && node.type !== 'anyOf' && node.type !== 'oneOf') {
    throw new Error(`Node ${node.id} is not a conditional group`);
  }
  
  const conditions = node.conditions || [];
  
  if (conditions.length === 0) {
    // Empty conditional group - return empty object schema
    return {
      type: 'object' as const,
      properties: {},
    };
  }
  
  // Check if all conditions share the same then/else (common UX pattern)
  const sharedThenId = conditions.length > 0 ? conditions[0].then : undefined;
  const sharedElseId = conditions.length > 0 ? conditions[0].else : undefined;
  const allShareThen = conditions.every(cond => cond.then === sharedThenId);
  const allShareElse = conditions.every(cond => cond.else === sharedElseId);
  
  // Compile shared then/else once if all conditions share them
  let sharedThenSchema: RJSFSchema | undefined;
  let sharedElseSchema: RJSFSchema | undefined;
  
  if (allShareThen && sharedThenId) {
    const thenNode = graph.nodes.get(sharedThenId);
    if (thenNode) {
      if (thenNode.type === 'ref') {
        sharedThenSchema = compileRefNode(thenNode);
      } else {
        sharedThenSchema = compileNode(graph, sharedThenId);
        // Preserve object title if it's an object node
        if (thenNode.type === 'object' && sharedThenSchema.type === 'object') {
          sharedThenSchema = {
            ...sharedThenSchema,
            title: thenNode.title || sharedThenSchema.title,
          } as RJSFSchema;
        }
      }
    }
  }
  
  if (allShareElse && sharedElseId) {
    const elseNode = graph.nodes.get(sharedElseId);
    if (elseNode) {
      if (elseNode.type === 'ref') {
        sharedElseSchema = compileRefNode(elseNode);
      } else {
        sharedElseSchema = compileNode(graph, sharedElseId);
        // Preserve object title if it's an object node
        if (elseNode.type === 'object' && sharedElseSchema.type === 'object') {
          sharedElseSchema = {
            ...sharedElseSchema,
            title: elseNode.title || sharedElseSchema.title,
          } as RJSFSchema;
        }
      }
    }
  }
  
  const strictMatchMode = node.type === 'anyOf' || node.type === 'oneOf';

  const buildBranchSchemaFromEdges = (edgeType: 'then' | 'else'): RJSFSchema | undefined => {
    const branchNodes = getChildren(graph, node.id, edgeType);
    if (branchNodes.length === 0) {
      return undefined;
    }

    // Special case: If there's a single object node, wrap it with its key
    // This allows objects in then/else branches to show up as properties, not root-level schemas
    if (branchNodes.length === 1) {
      const branchNode = branchNodes[0];
      if (branchNode.id === node.id) {
        return undefined;
      }

      // If it's an object-like node, compile it and wrap it with its key
      if (branchNode.type === 'object' || OBJECT_LIKE_BRANCH_TYPES.has(branchNode.type)) {
        const compiled = branchNode.type === 'ref'
          ? compileRefNode(branchNode)
          : compileNode(graph, branchNode.id);
        
        // Wrap the compiled object in a properties wrapper with its key
        // This ensures RJSF treats it as a property to add, not a root schema
        if (branchNode.key && branchNode.key.trim() !== '') {
          return {
            type: 'object' as const,
            properties: {
              [branchNode.key]: {
                ...compiled,
                title: branchNode.title || compiled.title,
              } as RJSFSchema,
            },
            ...(branchNode.required ? { required: [branchNode.key] } : {}),
          };
        }
      }
    }

    // Multiple nodes or non-object nodes: merge properties as before
    const mergedProperties: Record<string, RJSFSchema> = {};
    const mergedRequired = new Set<string>();

    branchNodes.forEach((branchNode) => {
      if (branchNode.id === node.id) {
        return;
      }

      const compiled = branchNode.type === 'ref'
        ? compileRefNode(branchNode)
        : compileNode(graph, branchNode.id);

      const normalized = normalizeBranchSchema(
        graph,
        branchNode.id,
        cloneSchema(compiled)
      );

      if (!normalized || !normalized.properties) {
        return;
      }

      Object.entries(normalized.properties).forEach(([key, value]) => {
        mergedProperties[key] = cloneSchema(value as RJSFSchema) ?? (value as RJSFSchema);
      });

      if (Array.isArray(normalized.required)) {
        normalized.required.forEach((key) => mergedRequired.add(key));
      }
    });

    if (Object.keys(mergedProperties).length === 0) {
      return undefined;
    }

    const branchSchema: RJSFSchema = {
      type: 'object',
      properties: mergedProperties,
    };

    if (mergedRequired.size > 0) {
      branchSchema.required = Array.from(mergedRequired);
    }

    return branchSchema;
  };

  const edgeThenSchema = buildBranchSchemaFromEdges('then');
  const edgeElseSchema = buildBranchSchemaFromEdges('else');

  const resolveBranchSchema = (
    branchId: string | undefined,
    sharedId: string | undefined,
    sharedSchema: RJSFSchema | undefined,
    reuseShared: boolean
  ): RJSFSchema | undefined => {
    const sourceId = branchId ?? (reuseShared ? sharedId : undefined);
    if (!sourceId) {
      return reuseShared ? normalizeBranchSchema(graph, sharedId, cloneSchema(sharedSchema)) : undefined;
    }

    if (reuseShared && sharedSchema) {
      // If sharedSchema is already an object with a title, preserve it
      if (sharedSchema.type === 'object' && sharedSchema.title) {
        return cloneSchema(sharedSchema);
      }
      return normalizeBranchSchema(graph, sourceId, cloneSchema(sharedSchema));
    }

    if (sourceId === node.id) {
      return undefined;
    }

    const branchNode = graph.nodes.get(sourceId);
    if (!branchNode) {
      return undefined;
    }

    const compiled = branchNode.type === 'ref'
      ? compileRefNode(branchNode)
      : compileNode(graph, sourceId);

    // If branch node is an object, wrap it with its key as a property
    if (branchNode.type === 'object' && compiled.type === 'object' && branchNode.key && branchNode.key.trim() !== '') {
      return {
        type: 'object' as const,
        properties: {
          [branchNode.key]: {
            ...compiled,
            title: branchNode.title || compiled.title,
          } as RJSFSchema,
        },
        ...(branchNode.required ? { required: [branchNode.key] } : {}),
      };
    }

    return normalizeBranchSchema(graph, sourceId, cloneSchema(compiled));
  };

  // Special case: When all conditions share the same then/else branches,
  // compile as a single if/then/else with combined conditions instead of separate ones
  if (allShareThen && (sharedThenSchema || edgeThenSchema)) {
    const combinedConditions = conditions.map(condition => compileCondition(condition.if));
    
    // Prefer edgeThenSchema as it's built from actual edges and properly structures fields
    // If not available, use sharedThenSchema (which already preserves object titles)
    let finalThenSchema: RJSFSchema | undefined;
    if (edgeThenSchema) {
      finalThenSchema = edgeThenSchema;
    } else if (sharedThenSchema) {
      // sharedThenSchema already preserves object titles, use it directly
      finalThenSchema = cloneSchema(sharedThenSchema);
    }
    
    // Same for else schema
    let finalElseSchema: RJSFSchema | undefined;
    if (edgeElseSchema) {
      finalElseSchema = edgeElseSchema;
    } else if (sharedElseSchema) {
      // sharedElseSchema already preserves object titles, use it directly
      finalElseSchema = cloneSchema(sharedElseSchema);
    }
    
    if (!finalThenSchema) {
      // No then branch available
      return {
        type: 'object' as const,
        properties: {},
      };
    }
    
    // Build the if clause - if only one condition, use it directly; otherwise combine
    let ifClause: RJSFSchema;
    if (combinedConditions.length === 1) {
      // Single condition - use it directly without wrapping in allOf/anyOf/oneOf
      ifClause = combinedConditions[0];
    } else {
      // Multiple conditions - combine using the group type
      ifClause = {
        [node.type]: combinedConditions,
      } as RJSFSchema;
    }
    
    const combinedSchema: RJSFSchema = {
      if: ifClause,
      then: finalThenSchema,
    };
    
    if (finalElseSchema) {
      combinedSchema.else = finalElseSchema;
    } else if (strictMatchMode) {
      combinedSchema.else = createFailingBranchSchema();
    }
    
    return combinedSchema;
  }

  // Fallback: Compile each condition as separate if/then blocks (for cases with different then/else branches)
  const compiledConditions: RJSFSchema[] = conditions.map((condition) => {
    const conditionSchema: RJSFSchema = {
      if: compileCondition(condition.if),
    };

    let thenSchema = resolveBranchSchema(
      condition.then,
      sharedThenId,
      sharedThenSchema,
      allShareThen
    );
    if (!thenSchema && edgeThenSchema) {
      thenSchema = cloneSchema(edgeThenSchema);
    }
    if (thenSchema) {
      conditionSchema.then = thenSchema;
    }

    let elseSchema = resolveBranchSchema(
      condition.else,
      sharedElseId,
      sharedElseSchema,
      allShareElse
    );
    if (!elseSchema && edgeElseSchema) {
      elseSchema = cloneSchema(edgeElseSchema);
    }
    if (elseSchema) {
      conditionSchema.else = elseSchema;
    }

    if (strictMatchMode && !conditionSchema.else) {
      conditionSchema.else = createFailingBranchSchema();
    }

    return conditionSchema;
  });
  
  // Return as allOf/anyOf/oneOf
  return {
    [node.type]: compiledConditions,
  } as RJSFSchema;
}

/**
 * Compile a condition (if clause)
 */
function compileCondition(condition: { field: string; operator: string; value: unknown }): RJSFSchema {
  const { field, operator, value } = condition;
  
  const createComparison = (op: string, val: unknown): RJSFSchema => {
    const stringValue = String(val);
    const numValue = Number(val);
    
    switch (op) {
      case 'equals':
        return { const: stringValue };
      case 'not_equals':
        return { not: { const: stringValue } };
      case 'greater_than':
        return {
          type: 'number' as const,
          exclusiveMinimum: numValue,
        };
      case 'less_than':
        return {
          type: 'number' as const,
          exclusiveMaximum: numValue,
        };
      case 'greater_equal':
        return {
          type: 'number' as const,
          minimum: numValue,
        };
      case 'less_equal':
        return {
          type: 'number' as const,
          maximum: numValue,
        };
      case 'contains':
        return {
          type: 'string' as const,
          pattern: `.*${stringValue}.*`,
        };
      case 'starts_with':
        return {
          type: 'string' as const,
          pattern: `^${stringValue}.*`,
        };
      case 'ends_with':
        return {
          type: 'string' as const,
          pattern: `.*${stringValue}$`,
        };
      case 'empty':
        return {
          oneOf: [
            { type: 'string' as const, maxLength: 0 },
            { type: 'null' as const },
          ],
        };
      case 'not_empty':
        return {
          allOf: [
            { type: 'string' as const },
            { minLength: 1 },
          ],
        };
      default:
        return { const: stringValue };
    }
  };
  
  return {
    properties: {
      [field]: createComparison(operator, value),
    },
    required: [field],
  };
}

/**
 * Compile a definition node (its content, not the wrapper)
 */
function compileDefinitionNode(graph: SchemaGraph, node: SchemaNode): RJSFSchema {
  // Definition nodes keep their original type, just compile them normally
  // The isDefinition flag is metadata only and doesn't affect compilation
  return compileFieldNode(graph, node);
}

/**
 * Compile legacy IF block
 */
function compileIfBlock(graph: SchemaGraph, node: SchemaNode): RJSFSchema {
  // If no condition is set, return an empty object schema (don't throw)
  // This allows IF blocks to be created and configured later
  if (!node.condition) {
    return {
      type: 'object',
      properties: {},
    };
  }
  
  const thenSchema: RJSFSchema = {
    type: 'object' as const,
    properties: {},
  };
  
  const elseSchema: RJSFSchema | undefined = node.else?.length ? {
    type: 'object' as const,
    properties: {},
  } : undefined;
  
  // Compile then branch
  const thenRequired: string[] = [];
  if (node.then?.length) {
    node.then.forEach((childId) => {
      const childNode = graph.nodes.get(childId);
      if (childNode && thenSchema.properties) {
        thenSchema.properties[childNode.key] = compileNode(graph, childId);
        if (childNode.required) {
          thenRequired.push(childNode.key);
        }
      }
    });
  }
  if (thenRequired.length > 0) {
    thenSchema.required = thenRequired;
  }
  
  // Compile else branch
  if (elseSchema && node.else?.length) {
    const elseRequired: string[] = [];
    node.else.forEach((childId) => {
      const childNode = graph.nodes.get(childId);
      if (childNode && elseSchema.properties) {
        elseSchema.properties[childNode.key] = compileNode(graph, childId);
        if (childNode.required) {
          elseRequired.push(childNode.key);
        }
      }
    });
    if (elseRequired.length > 0) {
      elseSchema.required = elseRequired;
    }
  }
  
  // Build the if condition
  const ifCondition = compileCondition(node.condition);
  
  return {
    if: ifCondition,
    then: thenSchema,
    ...(elseSchema ? { else: elseSchema } : {}),
  };
}

/**
 * Compile a regular field node
 */
function compileFieldNode(graph: SchemaGraph, node: SchemaNode): RJSFSchema {
  const schema: RJSFSchema = {
    type: getSchemaType(node.type),
    title: node.title,
  };
  
  if (node.description) {
    schema.description = node.description;
  }
  
  if (node.default !== undefined) {
    // Cast to RJSFSchema compatible type
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    schema.default = node.default as any;
  }
  
  // Handle enum
  if (node.type === 'enum' && node.enum) {
    schema.enum = node.enum;
    if (node.enumNames) {
      (schema as RJSFSchema).enumNames = node.enumNames;
    }
  }
  
  // Handle object with children
  if (node.type === 'object') {
    const children = getChildren(graph, node.id, 'child');
    const nestedConditionals: RJSFSchema[] = [];
    const conditionalGroups: Array<{ type: 'allOf' | 'anyOf' | 'oneOf'; schema: RJSFSchema }> = [];
    
    if (children.length > 0) {
      schema.properties = {};
      schema.required = [];
      
      children.forEach((child) => {
        const childSchema = compileNode(graph, child.id);
        
        // Check if child is a conditional group
        if (child.type === 'allOf' || child.type === 'anyOf' || child.type === 'oneOf') {
          // Store the conditional group with its type to preserve it
          conditionalGroups.push({
            type: child.type,
            schema: childSchema,
          });
        } else if (child.type === 'if_block') {
          nestedConditionals.push(childSchema);
        } else {
          // Regular property - skip if key is empty (shouldn't happen with auto-generation, but safety check)
          if (schema.properties && child.key && child.key.trim() !== '') {
            schema.properties[child.key] = childSchema;
            if (child.required) {
              schema.required?.push(child.key);
            }
          }
        }
      });
      
      if (schema.required && schema.required.length === 0) {
        delete schema.required;
      }
      
      // Handle conditional groups - preserve their type (allOf/anyOf/oneOf)
      if (conditionalGroups.length > 0) {
        // If we have a single conditional group, use its type directly
        if (conditionalGroups.length === 1) {
          const group = conditionalGroups[0];
          // Extract the conditions from the compiled schema
          if (group.type === 'allOf' && group.schema.allOf) {
            schema.allOf = group.schema.allOf as RJSFSchema[];
          } else if (group.type === 'anyOf' && group.schema.anyOf) {
            schema.anyOf = group.schema.anyOf as RJSFSchema[];
          } else if (group.type === 'oneOf' && group.schema.oneOf) {
            schema.oneOf = group.schema.oneOf as RJSFSchema[];
          } else {
            // Fallback: wrap in allOf
            nestedConditionals.push(group.schema);
          }
        } else {
          // Multiple conditional groups - extract conditions and determine how to combine them
          // For now, if all are the same type, use that type; otherwise wrap in allOf
          const types = conditionalGroups.map(g => g.type);
          const allSameType = types.every(t => t === types[0]);
          
          if (allSameType && types[0]) {
            // All same type - combine all conditions
            const combinedConditions: RJSFSchema[] = [];
            conditionalGroups.forEach(group => {
              if (group.type === 'allOf' && group.schema.allOf) {
                combinedConditions.push(...(group.schema.allOf as RJSFSchema[]));
              } else if (group.type === 'anyOf' && group.schema.anyOf) {
                combinedConditions.push(...(group.schema.anyOf as RJSFSchema[]));
              } else if (group.type === 'oneOf' && group.schema.oneOf) {
                combinedConditions.push(...(group.schema.oneOf as RJSFSchema[]));
              }
            });
            
            if (combinedConditions.length > 0) {
              (schema as Record<string, unknown>)[types[0]] = combinedConditions;
            }
          } else {
            // Mixed types - wrap each group in allOf
            conditionalGroups.forEach(group => {
              nestedConditionals.push(group.schema);
            });
          }
        }
      }
      
      // Add any remaining nested conditionals (if_block or mixed conditional groups) using allOf
      if (nestedConditionals.length > 0) {
        // If we already have a conditional type set, we need to wrap everything
        if (schema.allOf || schema.anyOf || schema.oneOf) {
          // Wrap existing conditionals and new ones together
          const existingConditions: RJSFSchema[] = [];
          if (schema.allOf) {
            existingConditions.push(...(schema.allOf as RJSFSchema[]));
            delete schema.allOf;
          }
          if (schema.anyOf) {
            existingConditions.push(...(schema.anyOf as RJSFSchema[]));
            delete schema.anyOf;
          }
          if (schema.oneOf) {
            existingConditions.push(...(schema.oneOf as RJSFSchema[]));
            delete schema.oneOf;
          }
          schema.allOf = [...existingConditions, ...nestedConditionals];
        } else {
          schema.allOf = nestedConditionals;
        }
      }
    }
    
    // Object-specific properties
    if (node.minProperties !== undefined) {
      schema.minProperties = node.minProperties;
    }
    if (node.maxProperties !== undefined) {
      schema.maxProperties = node.maxProperties;
    }
    if (node.additionalProperties !== undefined) {
      schema.additionalProperties = node.additionalProperties;
    }
  }
  
  // Handle array
  if (node.type === 'array') {
    const children = getChildren(graph, node.id, 'child');
    if (children.length > 0) {
      schema.items = compileNode(graph, children[0].id);
    }
    
    // Array-specific properties
    if (node.minItems !== undefined) {
      schema.minItems = node.minItems;
    }
    if (node.maxItems !== undefined) {
      schema.maxItems = node.maxItems;
    }
    if (node.uniqueItems !== undefined) {
      schema.uniqueItems = node.uniqueItems;
    }
    if (node.additionalItems !== undefined) {
      schema.additionalItems = node.additionalItems;
    }
  }
  
  // Handle string properties
  if (node.type === 'string' || node.type === 'enum') {
    if (node.minLength !== undefined) {
      schema.minLength = node.minLength;
    }
    if (node.maxLength !== undefined) {
      schema.maxLength = node.maxLength;
    }
    if (node.pattern) {
      schema.pattern = node.pattern;
    }
    if (node.format) {
      schema.format = node.format;
    }
  }
  
  // Handle number properties
  if (node.type === 'number') {
    if (node.minimum !== undefined) {
      schema.minimum = node.minimum;
    }
    if (node.maximum !== undefined) {
      schema.maximum = node.maximum;
    }
    if (node.multipleOf !== undefined) {
      schema.multipleOf = node.multipleOf;
    }
    if (node.exclusiveMinimum !== undefined) {
      schema.exclusiveMinimum = node.exclusiveMinimum;
    }
    if (node.exclusiveMaximum !== undefined) {
      schema.exclusiveMaximum = node.exclusiveMaximum;
    }
  }
  
  return schema;
}

/**
 * Convert internal type to JSON Schema type
 */
function getSchemaType(type: string): 'string' | 'number' | 'boolean' | 'object' | 'array' {
  switch (type) {
    case 'enum':
    case 'string':
      return 'string';
    case 'if_block':
    case 'definition':
      return 'object';
    case 'allOf':
    case 'anyOf':
    case 'oneOf':
      return 'object';
    default:
      return type as 'string' | 'number' | 'boolean' | 'object' | 'array';
  }
}

/**
 * Collect all definition names that are referenced in the graph
 */
function collectReferencedDefinitions(graph: SchemaGraph): Set<string> {
  const referenced = new Set<string>();
  
  // Traverse all nodes and find references
  graph.nodes.forEach((node) => {
    if (node.type === 'ref' && node.refTarget) {
      referenced.add(node.refTarget);
    }
    
    // Also check conditional groups for references in then/else
    if (node.conditions) {
      node.conditions.forEach((condition) => {
        if (condition.then) {
          const thenNode = graph.nodes.get(condition.then);
          if (thenNode?.type === 'ref' && thenNode.refTarget) {
            referenced.add(thenNode.refTarget);
          }
        }
        if (condition.else) {
          const elseNode = graph.nodes.get(condition.else);
          if (elseNode?.type === 'ref' && elseNode.refTarget) {
            referenced.add(elseNode.refTarget);
          }
        }
      });
    }
  });
  
  return referenced;
}

