import { useSchemaGraphStore } from "@/lib/store/schema-graph";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Editor } from "@monaco-editor/react";
import { ThemeProvider, createTheme, IconButton, Tooltip } from "@mui/material";
import validator from "@rjsf/validator-ajv8";
import { withTheme } from "@rjsf/core";
import { Theme as RJSFMuiTheme } from "@rjsf/mui";
import type { RJSFSchema } from "@rjsf/utils";
import { useTheme } from "@/components/theme-provider";
import { useState } from "react";
import { toast } from "sonner";
import { Pencil, X, Check, Copy } from "lucide-react";

// Create the Material-UI form component
const Form = withTheme(RJSFMuiTheme);

interface PreviewPanelProps {
  showPreview: boolean;
}

export function PreviewPanel({ showPreview }: PreviewPanelProps) {
  const { compileToJsonSchema, setSchemaFromJson } = useSchemaGraphStore();
  const { theme: colorMode } = useTheme();
  const schema = compileToJsonSchema() as RJSFSchema;
  const [editMode, setEditMode] = useState(false);
  const [editedSchema, setEditedSchema] = useState(
    JSON.stringify(schema, null, 2)
  );

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

  const handleSaveSchema = () => {
    try {
      const parsedSchema = JSON.parse(editedSchema);
      setSchemaFromJson(parsedSchema);
      setEditMode(false);
      toast.success("Schema updated successfully");
    } catch {
      toast.error("Invalid JSON schema");
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

  return (
    <ScrollArea className="h-full">
      <div className="p-4 pt-16">
        {showPreview ? (
          <div className="rounded-lg border bg-background p-4">
            <ThemeProvider theme={muiTheme}>
              <Form
                schema={schema}
                validator={validator}
                onSubmit={console.log}
              />
            </ThemeProvider>
          </div>
        ) : (
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
                      <X className="h-4 w-4" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Save">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={handleSaveSchema}
                    >
                      <Check className="h-4 w-4" />
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
                      onClick={() => setEditMode(true)}
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
              value={editMode ? editedSchema : JSON.stringify(schema, null, 2)}
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
        )}
      </div>
    </ScrollArea>
  );
}
