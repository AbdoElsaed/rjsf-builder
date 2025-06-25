import { ModeToggle } from "@/components/mode-toggle";
import { Code2 } from "lucide-react";

export function Header() {
  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-14 items-center justify-center">
        <div className="w-full max-w-[1400px] flex items-center justify-between px-4">
          <div className="flex items-center gap-2 font-semibold">
            <Code2 className="h-6 w-6" />
            <span className="hidden sm:inline-block">RJSF Builder</span>
          </div>
          <ModeToggle />
        </div>
      </div>
    </header>
  );
}
