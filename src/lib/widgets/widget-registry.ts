import type { JSONSchemaType } from '../store/schema-graph';
import type { SchemaNode } from '../graph/schema-graph';

/**
 * Custom widget definition
 * Represents a widget that can be used in RJSF forms
 */
export interface CustomWidget {
  id: string;
  name: string;  // e.g., "YesNoWidget", "AddPhotoToGallery"
  displayName: string;
  description?: string;
  compatibleTypes: JSONSchemaType[];  // Which field types can use this widget
  defaultConfig: Record<string, unknown>;  // Default UI schema options
  icon?: string;
  category?: 'standard' | 'custom' | 'specialized';
}

/**
 * Widget Registry
 * Manages available widgets and their mappings to field types
 */
export class WidgetRegistry {
  private widgets: Map<string, CustomWidget> = new Map();
  private typeWidgetMap: Map<JSONSchemaType, Set<string>> = new Map();
  private autoMappingRules: Array<{
    predicate: (node: SchemaNode) => boolean;
    widgetId: string;
  }> = [];

  constructor() {
    this.registerPredefinedWidgets();
  }

  /**
   * Register a widget in the registry
   */
  registerWidget(widget: CustomWidget): void {
    this.widgets.set(widget.id, widget);

    // Update type mapping
    widget.compatibleTypes.forEach((type) => {
      if (!this.typeWidgetMap.has(type)) {
        this.typeWidgetMap.set(type, new Set());
      }
      this.typeWidgetMap.get(type)!.add(widget.id);
    });
  }

  /**
   * Get a widget by ID
   */
  getWidget(widgetId: string): CustomWidget | null {
    return this.widgets.get(widgetId) || null;
  }

  /**
   * Get all widgets compatible with a field type
   */
  getCompatibleWidgets(fieldType: JSONSchemaType): CustomWidget[] {
    const widgetIds = this.typeWidgetMap.get(fieldType) || new Set();
    return Array.from(widgetIds)
      .map((id) => this.widgets.get(id))
      .filter((widget): widget is CustomWidget => widget !== undefined);
  }

  /**
   * Get all registered widgets
   */
  getAllWidgets(): CustomWidget[] {
    return Array.from(this.widgets.values());
  }

  /**
   * Get widgets by category
   */
  getWidgetsByCategory(category: 'standard' | 'custom' | 'specialized'): CustomWidget[] {
    return Array.from(this.widgets.values()).filter(
      (widget) => widget.category === category
    );
  }

  /**
   * Auto-detect widget for a field based on rules
   */
  getWidgetForField(node: SchemaNode): CustomWidget | null {
    // Check auto-mapping rules first
    for (const rule of this.autoMappingRules) {
      if (rule.predicate(node)) {
        return this.getWidget(rule.widgetId);
      }
    }

    // Default: return first compatible widget for the type
    const compatible = this.getCompatibleWidgets(node.type as JSONSchemaType);
    return compatible.length > 0 ? compatible[0] : null;
  }

  /**
   * Add an auto-mapping rule
   * Rules are checked in order, first match wins
   */
  addAutoMappingRule(
    predicate: (node: SchemaNode) => boolean,
    widgetId: string
  ): void {
    if (!this.widgets.has(widgetId)) {
      throw new Error(`Widget ${widgetId} not found`);
    }
    this.autoMappingRules.push({ predicate, widgetId });
  }

  /**
   * Register predefined widgets
   */
  private registerPredefinedWidgets(): void {
    // Standard RJSF widgets
    this.registerWidget({
      id: 'text',
      name: 'TextWidget',
      displayName: 'Text Input',
      description: 'Standard single-line text input',
      compatibleTypes: ['string'],
      defaultConfig: {},
      category: 'standard',
    });

    this.registerWidget({
      id: 'textarea',
      name: 'TextareaWidget',
      displayName: 'Textarea',
      description: 'Multi-line text input',
      compatibleTypes: ['string'],
      defaultConfig: {},
      category: 'standard',
    });

    this.registerWidget({
      id: 'select',
      name: 'SelectWidget',
      displayName: 'Select Dropdown',
      description: 'Dropdown select menu',
      compatibleTypes: ['string', 'enum'],
      defaultConfig: {},
      category: 'standard',
    });

    this.registerWidget({
      id: 'checkbox',
      name: 'CheckboxWidget',
      displayName: 'Checkbox',
      description: 'Single checkbox input',
      compatibleTypes: ['boolean'],
      defaultConfig: {},
      category: 'standard',
    });

    this.registerWidget({
      id: 'number',
      name: 'NumberWidget',
      displayName: 'Number Input',
      description: 'Number input field',
      compatibleTypes: ['number'],
      defaultConfig: {},
      category: 'standard',
    });

    // Specialized widgets
    this.registerWidget({
      id: 'yesno',
      name: 'YesNoWidget',
      displayName: 'Yes/No Select',
      description: 'Yes/No selection widget for enum fields',
      compatibleTypes: ['enum', 'string'],
      defaultConfig: {
        enumOptions: [
          { value: 'yes', label: 'نعم' },
          { value: 'no', label: 'لا' },
        ],
      },
      category: 'specialized',
    });

    this.registerWidget({
      id: 'photo-gallery',
      name: 'AddPhotoToGallery',
      displayName: 'Photo Gallery',
      description: 'Image upload with gallery view for array fields',
      compatibleTypes: ['array'],
      defaultConfig: {
        addable: true,
        orderable: true,
        removable: true,
      },
      category: 'specialized',
    });

    // Add auto-mapping rules
    this.addAutoMappingRule(
      (node) => {
        // Enum with yes/no values
        return (
          node.type === 'enum' &&
          node.enum?.length === 2 &&
          node.enum.includes('yes') &&
          node.enum.includes('no')
        );
      },
      'yesno'
    );

    this.addAutoMappingRule(
      (node) => {
        // Array of strings (likely images)
        return (
          node.type === 'array' &&
          node.format === 'image' ||
          (node.key?.toLowerCase().includes('photo') ||
           node.key?.toLowerCase().includes('image') ||
           node.key?.toLowerCase().includes('gallery'))
        );
      },
      'photo-gallery'
    );
  }
}

// Singleton instance
let widgetRegistryInstance: WidgetRegistry | null = null;

/**
 * Get the global widget registry instance
 */
export function getWidgetRegistry(): WidgetRegistry {
  if (!widgetRegistryInstance) {
    widgetRegistryInstance = new WidgetRegistry();
  }
  return widgetRegistryInstance;
}

/**
 * Reset the widget registry (useful for testing)
 */
export function resetWidgetRegistry(): void {
  widgetRegistryInstance = null;
}

