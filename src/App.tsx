import { ThemeProvider } from "@/components/theme-provider";
import { FormBuilderLayout } from "@/components/form-builder/layout";
import { Header } from "@/components/header";

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="flex h-screen flex-col bg-background">
        <Header />
        <main className="flex-1">
          <FormBuilderLayout />
        </main>
      </div>
    </ThemeProvider>
  );
}

export default App;
