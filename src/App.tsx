import { ThemeProvider } from "@/components/theme-provider";
import { FormBuilderLayout } from "@/components/form-builder/layout";
import { Header } from "@/components/header";
import { Toaster } from "sonner";
import { useTheme } from "@/components/theme-provider";

function App() {
  const { theme } = useTheme();

  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="flex h-screen flex-col bg-background">
        <Header />
        <main className="flex-1">
          <FormBuilderLayout />
        </main>
        <Toaster
          theme={theme as "light" | "dark"}
          toastOptions={{
            classNames: {
              toast:
                "bg-card text-card-foreground border border-border shadow-lg",
              title: "text-foreground font-semibold",
              description: "text-muted-foreground",
              actionButton: "bg-primary text-primary-foreground",
              cancelButton: "bg-muted hover:bg-muted/80 text-muted-foreground",
              error:
                "!bg-destructive/95 !text-destructive-foreground border-destructive/30",
              success:
                "!bg-primary/95 !text-primary-foreground border-primary/30",
            },
          }}
        />
      </div>
    </ThemeProvider>
  );
}

export default App;
