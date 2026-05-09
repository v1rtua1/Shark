"use client";

import { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  content: string;
  isOwn: boolean;
  timestamp?: string;
  status?: "sending" | "sent" | "delivered" | "read";
  imageUrl?: string;
}

export const MessageBubble = memo(function MessageBubble({ content, isOwn, timestamp, status, imageUrl }: MessageBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={cn(
        "flex w-full mb-4 min-w-0",
        isOwn ? "justify-end" : "justify-start"
      )}
    >
      <div
        className={cn(
          "max-w-[85%] sm:max-w-[75%] px-4 py-3 rounded-3xl relative overflow-hidden flex flex-col min-w-0",
          isOwn
            ? "bg-gradient-to-br from-primary to-accent text-white rounded-br-sm shadow-md shadow-primary/20"
            : "glass text-foreground rounded-bl-sm"
        )}
      >
        {imageUrl && (
          <div className="mb-2 rounded-xl overflow-hidden bg-black/20 w-full">
            <img src={imageUrl} alt="Attached media" className="w-full h-auto object-cover" loading="lazy" />
          </div>
        )}
        {content && <p className="text-[15px] leading-relaxed break-words whitespace-pre-wrap [word-wrap:break-word] min-w-0 selectable-text">{content}</p>}
        
        {/* Timestamp and status */}
        <div
          className={cn(
            "flex items-center justify-end gap-1 mt-1 text-[11px] shrink-0",
            isOwn ? "text-white/70" : "text-zinc-500"
          )}
        >
          {timestamp && <span>{timestamp}</span>}
          {isOwn && status && (
            <span className="ml-1 shrink-0">
              {status === "read" && "✓✓"}
              {status === "delivered" && "✓✓"}
              {status === "sent" && "✓"}
              {status === "sending" && "⋯"}
            </span>
          )}
        </div>
      </div>
    </motion.div>
  );
});
