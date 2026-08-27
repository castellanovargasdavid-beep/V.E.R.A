import * as React from "react";
import { cn } from "@/lib/utils";

export const ScrollArea = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "overflow-y-auto [scrollbar-width:thin] [scrollbar-color:hsl(var(--jarvis)/0.4)_transparent]",
          className
        )}
        {...props}
      />
    );
  }
);
ScrollArea.displayName = "ScrollArea";
