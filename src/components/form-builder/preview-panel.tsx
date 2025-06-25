import { useSchemaGraphStore } from "@/lib/store/schema-graph";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Editor } from "@monaco-editor/react";
import Form from "@rjsf/core";
import validator from "@rjsf/validator-ajv8";
import type { RJSFSchema } from "@rjsf/utils";
import { useTheme } from "@/components/theme-provider";

interface PreviewPanelProps {
  showPreview: boolean;
}

export function PreviewPanel({ showPreview }: PreviewPanelProps) {
  const { compileToJsonSchema } = useSchemaGraphStore();
  const { theme } = useTheme();
  const schema = compileToJsonSchema() as RJSFSchema;

  return (
    <ScrollArea className="h-full">
      <div className="p-4 pt-16">
        {showPreview ? (
          <div className="rounded-lg border bg-background p-4">
            <Form
              schema={schema}
              validator={validator}
              onSubmit={console.log}
            />
          </div>
        ) : (
          <div className="rounded-lg border bg-background overflow-hidden">
            <Editor
              height="70vh"
              defaultLanguage="json"
              value={JSON.stringify(schema, null, 2)}
              theme={theme === "dark" ? "vs-dark" : "light"}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: "on",
                readOnly: true,
              }}
            />
          </div>
        )}
      </div>
    </ScrollArea>
  );
}
