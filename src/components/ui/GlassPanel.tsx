"use client";

import * as React from "react";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

interface GlassPanelProps extends HTMLMotionProps<"div"> {
  variant?: "default" | "heavy" | "light";
}

const GlassPanel = React.forwardRef<HTMLDivElement, GlassPanelProps>(
  ({ className, variant = "default", children, ...props }, ref) => {
    
    const variants = {
      default: "glass",
      heavy: "glass-panel",
      light: "bg-white/5 backdrop-blur-md border border-white/5",
    };

    return (
      <motion.div
        ref={ref}
        className={cn("rounded-3xl overflow-hidden", variants[variant], className)}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
GlassPanel.displayName = "GlassPanel";

export { GlassPanel };
