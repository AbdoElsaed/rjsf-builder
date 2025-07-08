import { useSchemaGraphStore } from "@/lib/store/schema-graph";
import { useFormDataStore } from "@/lib/store/form-data";
import { useUiSchemaStore } from "@/lib/store/ui-schema";
import type { JSONValue } from "@/lib/store/form-data";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Editor } from "@monaco-editor/react";
import { ThemeProvider, createTheme, IconButton, Tooltip } from "@mui/material";
import validator from "@rjsf/validator-ajv8";
import { withTheme } from "@rjsf/core";
import { Theme as RJSFShadcnTheme } from "@rjsf/shadcn";
import type { RJSFSchema } from "@rjsf/utils";
import type { IChangeEvent } from "@rjsf/core";
import { useTheme } from "@/components/theme-provider";
import { useState, useEffect, useRef } from "react";
import { toast } from "sonner";
import { Pencil, X, Check, Copy } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Create the Material-UI form component
const Form = withTheme(RJSFShadcnTheme);

interface PreviewPanelProps {
  showPreview: boolean;
}

export function PreviewPanel({ showPreview }: PreviewPanelProps) {
  const { compileToJsonSchema, setSchemaFromJson } = useSchemaGraphStore();
  const { formData, updateFormData, migrateFormData } = useFormDataStore();
  const { uiSchema, updateUiSchema } = useUiSchemaStore();
  const { theme: colorMode } = useTheme();
  const schema = compileToJsonSchema() as RJSFSchema;
  const previousSchema = useRef<RJSFSchema>(schema);
  const [editMode, setEditMode] = useState(false);
  const [editedSchema, setEditedSchema] = useState(
    JSON.stringify(schema, null, 2)
  );
  const [editedUiSchema, setEditedUiSchema] = useState(
    JSON.stringify(uiSchema, null, 2)
  );
  const [editedFormData, setEditedFormData] = useState(
    JSON.stringify(formData, null, 2)
  );
  const [formDataEditMode, setFormDataEditMode] = useState(false);
  const [uiSchemaEditMode, setUiSchemaEditMode] = useState(false);

  // Watch for schema changes and migrate form data
  useEffect(() => {
    // Only migrate form data for automatic schema changes, not when manually editing
    if (
      !editMode &&
      JSON.stringify(schema) !== JSON.stringify(previousSchema.current)
    ) {
      migrateFormData(previousSchema.current, schema);
      previousSchema.current = schema;
    } else if (!editMode) {
      // Update the reference when not in edit mode
      previousSchema.current = schema;
    }
  }, [schema, migrateFormData, editMode]);

  // Create MUI theme based on the app's color mode
  const muiTheme = createTheme({
    palette: {
      mode: colorMode === "dark" ? "dark" : "light",
    },
    components: {
      MuiInputBase: {
        styleOverrides: {
          root: {
            backgroundColor: "transparent",
          },
        },
      },
    },
  });

  const handleSchemaChange = (value: string | undefined) => {
    if (value) {
      setEditedSchema(value);
    }
  };

  const handleUiSchemaChange = (value: string | undefined) => {
    if (value) {
      setEditedUiSchema(value);
    }
  };

  const handleFormDataChange = (value: string | undefined) => {
    if (value) {
      setEditedFormData(value);
    }
  };

  const handleSaveSchema = () => {
    try {
      const parsedSchema = JSON.parse(editedSchema);

      // Get current form data before schema change
      const currentFormData = formData;

      // Update the schema
      setSchemaFromJson(parsedSchema);

      // Preserve form data for fields that still exist in the new schema
      const preservedFormData = preserveCompatibleFormData(
        currentFormData,
        parsedSchema
      );
      updateFormData(preservedFormData);

      setEditMode(false);
      toast.success("Schema updated successfully");
    } catch {
      toast.error("Invalid JSON schema");
    }
  };

  // Helper function to preserve form data that's compatible with the new schema
  const preserveCompatibleFormData = (
    currentData: Record<string, JSONValue>,
    newSchema: RJSFSchema
  ): Record<string, JSONValue> => {
    if (!newSchema.properties) {
      return {};
    }

    const preservedData: Record<string, JSONValue> = {};

    // Go through each property in the new schema
    Object.entries(newSchema.properties).forEach(([key, property]) => {
      if (key in currentData) {
        const currentValue = currentData[key];

        if (typeof property === "object" && property !== null) {
          // Check if the field type is compatible
          if (
            property.type === "object" &&
            typeof currentValue === "object" &&
            currentValue !== null &&
            !Array.isArray(currentValue)
          ) {
            // For object fields, recursively preserve compatible nested data
            preservedData[key] = preserveCompatibleFormData(
              currentValue as Record<string, JSONValue>,
              property as RJSFSchema
            );
          } else if (property.type === "array" && Array.isArray(currentValue)) {
            // For array fields, preserve the array if the type matches
            preservedData[key] = currentValue;
          } else if (
            (property.type === "string" && typeof currentValue === "string") ||
            (property.type === "number" && typeof currentValue === "number") ||
            (property.type === "integer" && typeof currentValue === "number") ||
            (property.type === "boolean" &&
              typeof currentValue === "boolean") ||
            // If no type is specified, preserve the value
            !property.type
          ) {
            preservedData[key] = currentValue;
          }
          // If types don't match, skip this field (it will be empty in the form)
        }
      }
    });

    return preservedData;
  };

  const handleSaveUiSchema = () => {
    try {
      const parsedUiSchema = JSON.parse(editedUiSchema);
      updateUiSchema(parsedUiSchema);
      setUiSchemaEditMode(false);
      toast.success("UI Schema updated successfully");
    } catch {
      toast.error("Invalid UI Schema");
    }
  };

  const handleSaveFormData = () => {
    try {
      const parsedFormData = JSON.parse(editedFormData);
      updateFormData(parsedFormData);
      setFormDataEditMode(false);
      toast.success("Form data updated successfully");
    } catch {
      toast.error("Invalid JSON data");
    }
  };

  const handleCopySchema = () => {
    const schemaToCopy = editMode
      ? editedSchema
      : JSON.stringify(schema, null, 2);
    navigator.clipboard.writeText(schemaToCopy).then(() => {
      toast.success("Schema copied to clipboard");
    });
  };

  const handleCopyUiSchema = () => {
    const uiSchemaToCopy = uiSchemaEditMode
      ? editedUiSchema
      : JSON.stringify(uiSchema, null, 2);
    navigator.clipboard.writeText(uiSchemaToCopy).then(() => {
      toast.success("UI Schema copied to clipboard");
    });
  };

  const handleCopyFormData = () => {
    const dataToCopy = formDataEditMode
      ? editedFormData
      : JSON.stringify(formData, null, 2);
    navigator.clipboard.writeText(dataToCopy).then(() => {
      toast.success("Form data copied to clipboard");
    });
  };

  const handleFormChange = (e: IChangeEvent<Record<string, JSONValue>>) => {
    if (e.formData) {
      updateFormData(e.formData);
      setEditedFormData(JSON.stringify(e.formData, null, 2));
    }
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 pt-16">
        {showPreview ? (
          <div className="rounded-lg border bg-background p-4">
            <ThemeProvider theme={muiTheme}>
              <Form
                schema={schema}
                uiSchema={uiSchema}
                validator={validator}
                formData={formData}
                onChange={handleFormChange}
                onSubmit={console.log}
              />
            </ThemeProvider>
          </div>
        ) : (
          <Tabs defaultValue="schema">
            <TabsList className="mb-4">
              <TabsTrigger value="schema">Schema</TabsTrigger>
              <TabsTrigger value="uiSchema">UI Schema</TabsTrigger>
              <TabsTrigger value="formData">Form Data</TabsTrigger>
            </TabsList>
            <TabsContent value="schema">
              <div className="rounded-lg border bg-background overflow-hidden">
                <div className="flex justify-end bg-muted/50 gap-1 p-1 border-b">
                  {editMode ? (
                    <>
                      <Tooltip title="Cancel">
                        <IconButton
                          size="small"
                          color="inherit"
                          onClick={() => {
                            setEditMode(false);
                            setEditedSchema(JSON.stringify(schema, null, 2));
                          }}
                        >
                          <X className="h-3 w-3" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Save">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={handleSaveSchema}
                        >
                          <Check className="h-3 w-3" />
                        </IconButton>
                      </Tooltip>
                    </>
                  ) : (
                    <>
                      <Tooltip title="Copy Schema">
                        <IconButton
                          size="small"
                          color="inherit"
                          onClick={handleCopySchema}
                        >
                          <Copy className="h-4 w-4" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Schema">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => {
                            setEditedSchema(JSON.stringify(schema, null, 2));
                            setEditMode(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                </div>
                <Editor
                  height="70vh"
                  defaultLanguage="json"
                  value={
                    editMode ? editedSchema : JSON.stringify(schema, null, 2)
                  }
                  onChange={handleSchemaChange}
                  theme={colorMode === "dark" ? "vs-dark" : "light"}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: "on",
                    readOnly: !editMode,
                  }}
                />
              </div>
            </TabsContent>
            <TabsContent value="uiSchema">
              <div className="rounded-lg border bg-background overflow-hidden">
                <div className="flex justify-end bg-muted/50 gap-1 p-1 border-b">
                  {uiSchemaEditMode ? (
                    <>
                      <Tooltip title="Cancel">
                        <IconButton
                          size="small"
                          color="inherit"
                          onClick={() => {
                            setUiSchemaEditMode(false);
                            setEditedUiSchema(
                              JSON.stringify(uiSchema, null, 2)
                            );
                          }}
                        >
                          <X className="h-3 w-3" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Save">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={handleSaveUiSchema}
                        >
                          <Check className="h-3 w-3" />
                        </IconButton>
                      </Tooltip>
                    </>
                  ) : (
                    <>
                      <Tooltip title="Copy UI Schema">
                        <IconButton
                          size="small"
                          color="inherit"
                          onClick={handleCopyUiSchema}
                        >
                          <Copy className="h-4 w-4" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit UI Schema">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => setUiSchemaEditMode(true)}
                        >
                          <Pencil className="h-4 w-4" />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                </div>
                <Editor
                  height="70vh"
                  defaultLanguage="json"
                  value={
                    uiSchemaEditMode
                      ? editedUiSchema
                      : JSON.stringify(uiSchema, null, 2)
                  }
                  onChange={handleUiSchemaChange}
                  theme={colorMode === "dark" ? "vs-dark" : "light"}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: "on",
                    readOnly: !uiSchemaEditMode,
                  }}
                />
              </div>
            </TabsContent>
            <TabsContent value="formData">
              <div className="rounded-lg border bg-background overflow-hidden">
                <div className="flex justify-end bg-muted/50 gap-1 p-1 border-b">
                  {formDataEditMode ? (
                    <>
                      <Tooltip title="Cancel">
                        <IconButton
                          size="small"
                          color="inherit"
                          onClick={() => {
                            setFormDataEditMode(false);
                            setEditedFormData(
                              JSON.stringify(formData, null, 2)
                            );
                          }}
                        >
                          <X className="h-3 w-3" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Save">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={handleSaveFormData}
                        >
                          <Check className="h-3 w-3" />
                        </IconButton>
                      </Tooltip>
                    </>
                  ) : (
                    <>
                      <Tooltip title="Copy Form Data">
                        <IconButton
                          size="small"
                          color="inherit"
                          onClick={handleCopyFormData}
                        >
                          <Copy className="h-4 w-4" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit Form Data">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => setFormDataEditMode(true)}
                        >
                          <Pencil className="h-4 w-4" />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                </div>
                <Editor
                  height="70vh"
                  defaultLanguage="json"
                  value={
                    formDataEditMode
                      ? editedFormData
                      : JSON.stringify(formData, null, 2)
                  }
                  onChange={handleFormDataChange}
                  theme={colorMode === "dark" ? "vs-dark" : "light"}
                  options={{
                    minimap: { enabled: false },
                    fontSize: 14,
                    lineNumbers: "on",
                    readOnly: !formDataEditMode,
                  }}
                />
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </ScrollArea>
  );
}
