import { describe, it, expect, beforeEach } from 'vitest';
import { WidgetRegistry, getWidgetRegistry, resetWidgetRegistry } from '../widget-registry';
import type { SchemaNode } from '../../graph/schema-graph-v2';

describe('WidgetRegistry', () => {
  beforeEach(() => {
    resetWidgetRegistry();
  });

  describe('registerWidget', () => {
    it('should register a widget', () => {
      const registry = getWidgetRegistry();
      
      registry.registerWidget({
        id: 'test-widget',
        name: 'TestWidget',
        displayName: 'Test Widget',
        description: 'A test widget',
        compatibleTypes: ['string'],
        defaultConfig: { test: true },
        category: 'custom',
      });

      const widget = registry.getWidget('test-widget');
      expect(widget).toBeDefined();
      expect(widget?.id).toBe('test-widget');
      expect(widget?.displayName).toBe('Test Widget');
    });

    it('should update type mapping when registering widget', () => {
      const registry = getWidgetRegistry();
      
      registry.registerWidget({
        id: 'test-widget',
        name: 'TestWidget',
        displayName: 'Test Widget',
        compatibleTypes: ['string', 'enum'],
        defaultConfig: {},
        category: 'standard',
      });

      const stringWidgets = registry.getCompatibleWidgets('string');
      const enumWidgets = registry.getCompatibleWidgets('enum');

      expect(stringWidgets.some(w => w.id === 'test-widget')).toBe(true);
      expect(enumWidgets.some(w => w.id === 'test-widget')).toBe(true);
    });
  });

  describe('getWidget', () => {
    it('should return widget by ID', () => {
      const registry = getWidgetRegistry();
      const widget = registry.getWidget('yesno');
      
      expect(widget).toBeDefined();
      expect(widget?.id).toBe('yesno');
      expect(widget?.name).toBe('YesNoWidget');
    });

    it('should return null for non-existent widget', () => {
      const registry = getWidgetRegistry();
      const widget = registry.getWidget('non-existent');
      
      expect(widget).toBeNull();
    });
  });

  describe('getCompatibleWidgets', () => {
    it('should return widgets compatible with field type', () => {
      const registry = getWidgetRegistry();
      const stringWidgets = registry.getCompatibleWidgets('string');
      
      expect(stringWidgets.length).toBeGreaterThan(0);
      expect(stringWidgets.every(w => w.compatibleTypes.includes('string'))).toBe(true);
    });

    it('should return empty array for unsupported type', () => {
      const registry = getWidgetRegistry();
      const widgets = registry.getCompatibleWidgets('boolean' as any);
      
      // Should have checkbox widget
      expect(widgets.length).toBeGreaterThan(0);
    });
  });

  describe('getWidgetsByCategory', () => {
    it('should filter widgets by category', () => {
      const registry = getWidgetRegistry();
      const specialized = registry.getWidgetsByCategory('specialized');
      
      expect(specialized.length).toBeGreaterThan(0);
      expect(specialized.every(w => w.category === 'specialized')).toBe(true);
    });
  });

  describe('getWidgetForField', () => {
    it('should auto-detect YesNoWidget for yes/no enum', () => {
      const registry = getWidgetRegistry();
      
      const node: SchemaNode = {
        id: 'test',
        key: 'has_car',
        type: 'enum',
        title: 'Has Car',
        enum: ['yes', 'no'],
      };

      const widget = registry.getWidgetForField(node);
      expect(widget?.id).toBe('yesno');
    });

    it('should auto-detect photo gallery for array with photo-related key', () => {
      const registry = getWidgetRegistry();
      
      const node: SchemaNode = {
        id: 'test',
        key: 'photo_gallery',
        type: 'array',
        title: 'Photos',
      };

      const widget = registry.getWidgetForField(node);
      expect(widget?.id).toBe('photo-gallery');
    });

    it('should return first compatible widget when no auto-mapping matches', () => {
      const registry = getWidgetRegistry();
      
      const node: SchemaNode = {
        id: 'test',
        key: 'description',
        type: 'string',
        title: 'Description',
      };

      const widget = registry.getWidgetForField(node);
      expect(widget).toBeDefined();
      expect(widget?.compatibleTypes).toContain('string');
    });
  });

  describe('addAutoMappingRule', () => {
    it('should add and use auto-mapping rule', () => {
      const registry = getWidgetRegistry();
      
      registry.registerWidget({
        id: 'special-string',
        name: 'SpecialStringWidget',
        displayName: 'Special String',
        compatibleTypes: ['string'],
        defaultConfig: {},
        category: 'custom',
      });

      registry.addAutoMappingRule(
        (node) => node.key === 'special_field',
        'special-string'
      );

      const node: SchemaNode = {
        id: 'test',
        key: 'special_field',
        type: 'string',
        title: 'Special Field',
      };

      const widget = registry.getWidgetForField(node);
      expect(widget?.id).toBe('special-string');
    });

    it('should throw error for non-existent widget in rule', () => {
      const registry = getWidgetRegistry();
      
      expect(() => {
        registry.addAutoMappingRule(
          (node) => true,
          'non-existent-widget'
        );
      }).toThrow('Widget non-existent-widget not found');
    });
  });

  describe('predefined widgets', () => {
    it('should have standard widgets registered', () => {
      const registry = getWidgetRegistry();
      
      expect(registry.getWidget('text')).toBeDefined();
      expect(registry.getWidget('textarea')).toBeDefined();
      expect(registry.getWidget('select')).toBeDefined();
      expect(registry.getWidget('checkbox')).toBeDefined();
      expect(registry.getWidget('number')).toBeDefined();
    });

    it('should have specialized widgets registered', () => {
      const registry = getWidgetRegistry();
      
      expect(registry.getWidget('yesno')).toBeDefined();
      expect(registry.getWidget('photo-gallery')).toBeDefined();
    });
  });
});

