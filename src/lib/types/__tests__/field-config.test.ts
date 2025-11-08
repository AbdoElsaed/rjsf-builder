import { describe, it, expect } from 'vitest';
import { getDefaultConfig } from '../field-config';
import type { JSONSchemaType } from '../../store/schema-graph';

describe('field-config', () => {
  describe('getDefaultConfig', () => {
    it('should return default config for string type', () => {
      const config = getDefaultConfig('string');
      
      expect(config.type).toBe('string');
      expect(config.title).toBe('');
      expect(config.ui).toEqual({});
    });

    it('should return default config for number type', () => {
      const config = getDefaultConfig('number');
      
      expect(config.type).toBe('number');
      expect(config.title).toBe('');
      expect(config.ui).toEqual({});
    });

    it('should return default config for boolean type', () => {
      const config = getDefaultConfig('boolean');
      
      expect(config.type).toBe('boolean');
      expect(config.title).toBe('');
      expect(config.ui).toEqual({});
    });

    it('should return default config for array type', () => {
      const config = getDefaultConfig('array');
      
      expect(config.type).toBe('array');
      expect(config.title).toBe('');
      expect(config.ui).toEqual({
        'ui:options': {
          addable: true,
          orderable: true,
          removable: true,
        },
      });
    });

    it('should return default config for object type', () => {
      const config = getDefaultConfig('object');
      
      expect(config.type).toBe('object');
      expect(config.title).toBe('');
      expect(config.ui).toEqual({});
    });

    it('should return default config for enum type', () => {
      const config = getDefaultConfig('enum');
      
      expect(config.type).toBe('enum');
      expect(config.title).toBe('');
      expect(config.enum).toEqual([]);
      expect(config.ui).toEqual({});
    });

    it('should return default config for if_block type', () => {
      const config = getDefaultConfig('if_block');
      
      expect(config.type).toBe('if_block');
      expect(config.title).toBe('');
      expect(config.ui).toEqual({});
    });

    it('should throw error for unsupported type', () => {
      expect(() => {
        getDefaultConfig('unsupported' as JSONSchemaType);
      }).toThrow('Unsupported field type: unsupported');
    });

    it('should have correct structure for all supported types', () => {
      const supportedTypes: JSONSchemaType[] = [
        'string',
        'number',
        'boolean',
        'array',
        'object',
        'enum',
        'if_block',
      ];

      supportedTypes.forEach(type => {
        const config = getDefaultConfig(type);
        
        expect(config).toHaveProperty('type', type);
        expect(config).toHaveProperty('title', '');
        expect(config).toHaveProperty('ui');
        expect(typeof config.ui).toBe('object');
      });
    });

    it('should provide appropriate UI options for array type', () => {
      const config = getDefaultConfig('array');
      
      expect(config.ui).toHaveProperty('ui:options');
      expect(config.ui['ui:options']).toHaveProperty('addable', true);
      expect(config.ui['ui:options']).toHaveProperty('orderable', true);
      expect(config.ui['ui:options']).toHaveProperty('removable', true);
    });

    it('should provide empty enum array for enum type', () => {
      const config = getDefaultConfig('enum');
      
      expect(config).toHaveProperty('enum');
      expect(Array.isArray(config.enum)).toBe(true);
      expect(config.enum).toHaveLength(0);
    });

    it('should maintain type safety', () => {
      const stringConfig = getDefaultConfig('string');
      const numberConfig = getDefaultConfig('number');
      const booleanConfig = getDefaultConfig('boolean');
      const arrayConfig = getDefaultConfig('array');
      const objectConfig = getDefaultConfig('object');
      const enumConfig = getDefaultConfig('enum');

      // Type assertions to ensure TypeScript type safety
      expect(stringConfig.type).toBe('string');
      expect(numberConfig.type).toBe('number');
      expect(booleanConfig.type).toBe('boolean');
      expect(arrayConfig.type).toBe('array');
      expect(objectConfig.type).toBe('object');
      expect(enumConfig.type).toBe('enum');
    });

    it('should create immutable default configs', () => {
      const config1 = getDefaultConfig('string');
      const config2 = getDefaultConfig('string');

      // Modify one config
      config1.title = 'Modified';
      config1.ui['ui:widget'] = 'textarea';

      // Other config should remain unchanged
      expect(config2.title).toBe('');
      expect(config2.ui['ui:widget']).toBeUndefined();
    });

    it('should handle all field configuration interfaces correctly', () => {
      // Test that the returned configs match their respective interfaces
      const stringConfig = getDefaultConfig('string');
      const numberConfig = getDefaultConfig('number');
      const booleanConfig = getDefaultConfig('boolean');
      const arrayConfig = getDefaultConfig('array');
      const objectConfig = getDefaultConfig('object');
      const enumConfig = getDefaultConfig('enum');

      // String config should have string-specific properties available
      expect(() => {
        const config = stringConfig as any;
        config.minLength = 1;
        config.maxLength = 100;
        config.pattern = '^[a-z]+$';
        config.format = 'email';
      }).not.toThrow();

      // Number config should have number-specific properties available
      expect(() => {
        const config = numberConfig as any;
        config.minimum = 0;
        config.maximum = 100;
        config.multipleOf = 5;
      }).not.toThrow();

      // Array config should have array-specific properties available
      expect(() => {
        const config = arrayConfig as any;
        config.minItems = 1;
        config.maxItems = 10;
        config.uniqueItems = true;
      }).not.toThrow();

      // Enum config should have enum-specific properties available
      expect(() => {
        const config = enumConfig as any;
        config.enum = ['option1', 'option2'];
        config.enumNames = ['Option 1', 'Option 2'];
      }).not.toThrow();
    });
  });
});
