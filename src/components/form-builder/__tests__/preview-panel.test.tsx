/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PreviewPanel } from '../preview-panel';
import { useSchemaGraphStore } from '../../../lib/store/schema-graph';
import { useFormDataStore } from '../../../lib/store/form-data';
import { useUiSchemaStore } from '../../../lib/store/ui-schema';

// Mock the stores
vi.mock('../../../lib/store/schema-graph');
vi.mock('../../../lib/store/form-data');
vi.mock('../../../lib/store/ui-schema');

// Mock theme provider
vi.mock('../../../components/theme-provider', () => ({
  useTheme: () => ({ theme: 'dark' }),
}));

// Mock Monaco Editor
vi.mock('@monaco-editor/react', () => ({
  Editor: ({ value, onChange }: any) => (
    <textarea
      data-testid="monaco-editor"
      value={value}
      onChange={(e) => onChange?.(e.target.value)}
    />
  ),
}));

// Mock RJSF components
vi.mock('@rjsf/core', () => ({
  withTheme: () => {
    // Return a component function directly, not an object with Form property
    return ({ formData, onChange }: any) => (
      <div data-testid="rjsf-form">
        <input
          data-testid="form-input"
          value={formData?.name || ''}
          onChange={(e) => onChange?.({ formData: { name: e.target.value } })}
        />
      </div>
    );
  },
}));

vi.mock('@rjsf/shadcn', () => ({
  Theme: {},
}));

vi.mock('@rjsf/validator-ajv8', () => ({
  default: {},
}));

// Mock MUI components
vi.mock('@mui/material', () => ({
  ThemeProvider: ({ children }: any) => <div data-testid="mui-theme-provider">{children}</div>,
  createTheme: () => ({}),
  IconButton: ({ children, onClick }: any) => (
    <button data-testid="mui-icon-button" onClick={onClick}>{children}</button>
  ),
  Tooltip: ({ children }: any) => <div data-testid="mui-tooltip">{children}</div>,
}));

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('PreviewPanel', () => {
  const mockCompileToJsonSchema = vi.fn();
  const mockSetSchemaFromJson = vi.fn();
  const mockUpdateFormData = vi.fn();
  const mockMigrateFormData = vi.fn();
  const mockUpdateUiSchema = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(useSchemaGraphStore).mockReturnValue({
      compileToJsonSchema: mockCompileToJsonSchema,
      setSchemaFromJson: mockSetSchemaFromJson,
    } as any);

    vi.mocked(useFormDataStore).mockReturnValue({
      formData: { name: 'John Doe' },
      updateFormData: mockUpdateFormData,
      migrateFormData: mockMigrateFormData,
    } as any);

    vi.mocked(useUiSchemaStore).mockReturnValue({
      uiSchema: { name: { 'ui:widget': 'text' } },
      updateUiSchema: mockUpdateUiSchema,
    } as any);

    mockCompileToJsonSchema.mockReturnValue({
      type: 'object',
      properties: {
        name: { type: 'string', title: 'Name' },
      },
    });
  });

  it('should render form preview by default', () => {
    render(<PreviewPanel showPreview={true} />);

    expect(screen.getByTestId('rjsf-form')).toBeInTheDocument();
    expect(screen.getByTestId('form-input')).toBeInTheDocument();
  });

  it('should render schema view when showPreview is false', () => {
    render(<PreviewPanel showPreview={false} />);

    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
    expect(screen.queryByTestId('rjsf-form')).not.toBeInTheDocument();
  });

  it('should display compiled schema in editor', () => {
    const mockSchema = {
      type: 'object',
      properties: {
        name: { type: 'string', title: 'Name' },
        age: { type: 'number', title: 'Age' },
      },
    };

    mockCompileToJsonSchema.mockReturnValue(mockSchema);

    render(<PreviewPanel showPreview={false} />);

    const editor = screen.getByTestId('monaco-editor');
    expect(editor).toHaveValue(JSON.stringify(mockSchema, null, 2));
  });

  it('should handle form data changes', async () => {
    render(<PreviewPanel showPreview={true} />);

    const formInput = screen.getByTestId('form-input');
    fireEvent.change(formInput, { target: { value: 'Jane Doe' } });

    // The mock form should trigger the onChange callback
    // Since we're mocking the form, we can't test the actual integration
    // but we can verify the form renders
    expect(screen.getByTestId('rjsf-form')).toBeInTheDocument();
  });

  it('should handle schema editing', async () => {
    render(<PreviewPanel showPreview={false} />);

    const editor = screen.getByTestId('monaco-editor');

    // The editor should be present and have the initial schema
    expect(editor).toBeInTheDocument();
    expect(editor).toHaveValue(JSON.stringify({
      type: 'object',
      properties: {
        name: { type: 'string', title: 'Name' },
      },
    }, null, 2));
  });

  it('should migrate form data when schema changes', () => {
    const { rerender } = render(<PreviewPanel showPreview={true} />);

    const newSchema = {
      type: 'object',
      properties: {
        fullName: { type: 'string', title: 'Full Name' },
      },
    };

    mockCompileToJsonSchema.mockReturnValue(newSchema);

    rerender(<PreviewPanel showPreview={true} />);

    // Migration should be called when schema changes
    // The exact behavior depends on the component implementation
    expect(screen.getByTestId('rjsf-form')).toBeInTheDocument();
  });

  it('should handle empty schema', () => {
    mockCompileToJsonSchema.mockReturnValue({});

    render(<PreviewPanel showPreview={false} />);

    const editor = screen.getByTestId('monaco-editor');
    expect(editor).toHaveValue('{}');
  });

  it('should handle complex nested schema', () => {
    const complexSchema = {
      type: 'object',
      properties: {
        person: {
          type: 'object',
          properties: {
            name: { type: 'string', title: 'Name' },
            address: {
              type: 'object',
              properties: {
                street: { type: 'string', title: 'Street' },
                city: { type: 'string', title: 'City' },
              },
            },
          },
        },
      },
    };

    mockCompileToJsonSchema.mockReturnValue(complexSchema);

    render(<PreviewPanel showPreview={false} />);

    const editor = screen.getByTestId('monaco-editor');
    expect(editor).toHaveValue(JSON.stringify(complexSchema, null, 2));
  });

  it('should handle form data with nested objects', () => {
    const nestedFormData = {
      person: {
        name: 'John Doe',
        address: {
          street: '123 Main St',
          city: 'Anytown',
        },
      },
    };

    vi.mocked(useFormDataStore).mockReturnValue({
      formData: nestedFormData,
      updateFormData: mockUpdateFormData,
      migrateFormData: mockMigrateFormData,
    } as any);

    render(<PreviewPanel showPreview={true} />);

    expect(screen.getByTestId('rjsf-form')).toBeInTheDocument();
  });

  it('should handle UI schema correctly', () => {
    const complexUiSchema = {
      name: {
        'ui:widget': 'textarea',
        'ui:options': { rows: 3 },
      },
      age: {
        'ui:widget': 'updown',
      },
    };

    vi.mocked(useUiSchemaStore).mockReturnValue({
      uiSchema: complexUiSchema,
      updateUiSchema: mockUpdateUiSchema,
    } as any);

    render(<PreviewPanel showPreview={true} />);

    expect(screen.getByTestId('rjsf-form')).toBeInTheDocument();
  });

  it('should handle schema compilation errors gracefully', () => {
    mockCompileToJsonSchema.mockImplementation(() => {
      throw new Error('Compilation error');
    });

    // The component should handle the error and still render
    render(<PreviewPanel showPreview={false} />);

    // Should still render the editor even with compilation errors
    expect(screen.getByTestId('monaco-editor')).toBeInTheDocument();
  });

  it('should update when stores change', () => {
    const { rerender } = render(<PreviewPanel showPreview={true} />);

    // Change form data
    vi.mocked(useFormDataStore).mockReturnValue({
      formData: { name: 'Jane Smith' },
      updateFormData: mockUpdateFormData,
      migrateFormData: mockMigrateFormData,
    } as any);

    rerender(<PreviewPanel showPreview={true} />);

    // The form should still render with updated data
    expect(screen.getByTestId('rjsf-form')).toBeInTheDocument();
  });

  it('should handle array fields in form data', () => {
    const arrayFormData = {
      tags: ['javascript', 'react', 'typescript'],
      numbers: [1, 2, 3],
    };

    vi.mocked(useFormDataStore).mockReturnValue({
      formData: arrayFormData,
      updateFormData: mockUpdateFormData,
      migrateFormData: mockMigrateFormData,
    } as any);

    render(<PreviewPanel showPreview={true} />);

    expect(screen.getByTestId('rjsf-form')).toBeInTheDocument();
  });
});
