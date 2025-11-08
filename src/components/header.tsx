import { ModeToggle } from "@/components/mode-toggle";
import { Code2 } from "lucide-react";

export function Header() {
  return (
    <header className="border-b border-border/50 bg-background/95 backdrop-blur-sm supports-[backdrop-filter]:bg-background/80 shadow-sm">
      <div className="flex h-16 items-center justify-center">
        <div className="w-full flex items-center justify-between px-4">
          <div className="flex items-center gap-3 font-semibold">
            <Code2 className="h-6 w-6 text-primary" />
            <span className="hidden sm:inline-block text-lg">RJSF Builder</span>
          </div>
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
