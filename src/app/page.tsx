"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/context/AuthContext";
import { Shield, Zap } from "lucide-react";

export default function SplashScreen() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      // Add a slight delay for the splash animation to finish
      const timer = setTimeout(() => {
        if (user) {
          router.push("/chats");
        } else {
          router.push("/auth");
        }
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [user, loading, router]);

  return (
    <AnimatePresence>
      <div className="flex min-h-screen items-center justify-center bg-background relative overflow-hidden">
        {/* Animated Background Gradients */}
        <div className="absolute inset-0 z-0">
          <motion.div
            animate={{
              scale: [1, 1.2, 1],
              opacity: [0.3, 0.5, 0.3],
            }}
            transition={{
              duration: 8,
              repeat: Infinity,
              ease: "easeInOut",
            }}
            className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-primary/20 blur-[100px]"
          />
          <motion.div
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: 10,
              repeat: Infinity,
              ease: "easeInOut",
              delay: 1,
            }}
            className="absolute -bottom-[20%] -right-[10%] w-[60vw] h-[60vw] rounded-full bg-accent/20 blur-[100px]"
          />
        </div>

        {/* Logo Animation */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, filter: "blur(10px)" }}
          animate={{ scale: 1, opacity: 1, filter: "blur(0px)" }}
          exit={{ scale: 1.2, opacity: 0, filter: "blur(10px)" }}
          transition={{
            duration: 1,
            ease: [0.2, 0.8, 0.2, 1],
          }}
          className="z-10 flex flex-col items-center gap-5"
        >
          <div className="relative flex h-28 w-28 items-center justify-center rounded-3xl bg-gradient-to-tr from-primary to-accent shadow-2xl shadow-primary/30 overflow-hidden group">
            <div className="absolute inset-0 bg-white/20 blur-xl group-hover:bg-white/30 transition-all"></div>
            <Zap className="h-14 w-14 text-white absolute transform -rotate-12" strokeWidth={2} />
          </div>
          <motion.h1
            initial={{ opacity: 0, y: 10, letterSpacing: "0px" }}
            animate={{ opacity: 1, y: 0, letterSpacing: "8px" }}
            transition={{ delay: 0.4, duration: 0.8, ease: "easeOut" }}
            className="text-4xl font-extrabold tracking-[8px] text-white uppercase ml-2"
          >
            Shark
          </motion.h1>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
