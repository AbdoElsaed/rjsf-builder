import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { ValidationResult } from "@/lib/import/import-validator";
import { getSchemaSummary } from "@/lib/import/import-validator";

interface ImportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schema: unknown;
  validation: ValidationResult;
  onConfirm: () => void;
  mode: 'replace' | 'merge';
}

export function ImportPreviewDialog({
  open,
  onOpenChange,
  schema,
  validation,
  onConfirm,
  mode,
}: ImportPreviewDialogProps) {
  const summary = getSchemaSummary(schema);

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import Preview</DialogTitle>
          <DialogDescription>
            Review the schema before importing
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Validation Status */}
          {validation.valid ? (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
              <CheckCircle2 className="h-5 w-5 text-emerald-600 dark:text-emerald-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
                  Schema is valid
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive mb-2">
                  Validation Errors
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs text-destructive/90">
                  {validation.errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Warnings */}
          {validation.warnings.length > 0 && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-amber-600 dark:text-amber-500 mb-2">
                  Warnings
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs text-amber-700 dark:text-amber-400">
                  {validation.warnings.map((warning, index) => (
                    <li key={index}>{warning}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Schema Summary */}
          <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
            <h4 className="text-sm font-semibold mb-3">Schema Summary</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Fields:</span>
                <span className="font-medium">{summary.fieldCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Definitions:</span>
                <span className="font-medium">{summary.definitionCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Conditional Blocks:</span>
                <span className="font-medium">{summary.conditionalCount}</span>
              </div>
            </div>
          </div>

          {/* Mode Warning */}
          {mode === 'replace' && (
            <div className="flex items-start gap-3 p-3 rounded-lg bg-destructive/10 border border-destructive/30">
              <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-destructive">
                  This will replace your current schema
                </p>
                <p className="text-xs text-destructive/80 mt-1">
                  All current fields and definitions will be removed and replaced with the imported schema.
                </p>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={!validation.valid}
            variant={mode === 'replace' ? 'destructive' : 'default'}
          >
            {mode === 'replace' ? 'Replace Schema' : 'Merge Schema'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

