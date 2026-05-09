"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { MessageSquare, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Don't show bottom nav on specific chat screen
  const isChatScreen = pathname?.match(/\/chats\/[a-zA-Z0-9_-]+$/);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-background">
      <main className="flex-1 overflow-y-auto no-scrollbar pb-20">
        {children}
      </main>

      {!isChatScreen && (
        <div className="fixed bottom-0 w-full p-4 pb-8 z-50">
          <div className="glass-panel max-w-sm mx-auto rounded-full p-2 flex justify-around items-center border border-white/10 shadow-lg shadow-black/20">
            <Link href="/chats" className="relative flex-1 flex justify-center py-2">
              {pathname === "/chats" && (
                <motion.div
                  layoutId="active-tab"
                  className="absolute inset-0 bg-white/10 rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                />
              )}
              <MessageSquare className={cn("w-6 h-6 relative z-10", pathname === "/chats" ? "text-primary" : "text-zinc-500")} />
            </Link>
            <Link href="/profile" className="relative flex-1 flex justify-center py-2">
              {pathname === "/profile" && (
                <motion.div
                  layoutId="active-tab"
                  className="absolute inset-0 bg-white/10 rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 25 }}
                />
              )}
              <User className={cn("w-6 h-6 relative z-10", pathname === "/profile" ? "text-primary" : "text-zinc-500")} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
