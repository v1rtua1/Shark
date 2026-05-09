"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PageTransition } from "@/components/ui/PageTransition";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { Lock, Mail } from "lucide-react";
import { motion } from "framer-motion";

export default function AuthScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  
  const router = useRouter();
  const { login, register, loginWithGoogle } = useAuth();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (isRegister && !username)) {
      setError("Please fill in all fields.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      if (isRegister) {
        await register(email, password, username);
      } else {
        await login(email, password);
      }
      router.push("/chats");
    } catch (err: any) {
      setError(err.message || "Authentication failed");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setError("");
      await loginWithGoogle();
      router.push("/chats");
    } catch (err: any) {
      setError(err.message || "Google sign in failed");
    }
  };

  return (
    <PageTransition className="flex items-center justify-center min-h-screen p-4 relative overflow-hidden bg-black">
      
      {/* Modern Abstract Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute -top-[10%] -left-[20%] w-[70vw] h-[70vw] rounded-full bg-primary/20 blur-[100px] mix-blend-screen animate-pulse" style={{ animationDuration: '8s' }} />
        <div className="absolute bottom-[0%] -right-[20%] w-[80vw] h-[80vw] rounded-full bg-purple-600/15 blur-[120px] mix-blend-screen animate-pulse" style={{ animationDuration: '12s', animationDelay: '2s' }} />
        <div className="absolute top-[40%] left-[20%] w-[40vw] h-[40vw] rounded-full bg-accent-teal/10 blur-[80px] mix-blend-screen animate-pulse" style={{ animationDuration: '10s', animationDelay: '1s' }} />
      </div>

      {/* Decorative Grid Overlay */}
      <div className="fixed inset-0 pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150 mix-blend-overlay"></div>
      <div className="fixed inset-0 pointer-events-none border-t border-white/5 bg-gradient-to-b from-transparent to-black/80"></div>

      <div className="w-full max-w-sm z-10">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="text-center mb-10"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-tr from-primary to-accent p-[2px] shadow-2xl shadow-primary/20">
            <div className="w-full h-full bg-black rounded-3xl flex items-center justify-center">
              <Lock className="w-8 h-8 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Secure Portal</h1>
          <p className="text-zinc-400 text-sm">Enter your credentials to access the encrypted network.</p>
        </motion.div>

        <motion.div
           initial={{ opacity: 0, scale: 0.95 }}
           animate={{ opacity: 1, scale: 1 }}
           transition={{ duration: 0.5, delay: 0.2 }}
        >
          <GlassPanel variant="heavy" className="p-8 border-white/10 bg-zinc-950/60 backdrop-blur-2xl shadow-2xl">
            <form onSubmit={handleAuth} className="space-y-5">
              {error && (
                <div className="p-3 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl text-center">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                {isRegister && (
                  <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-primary transition-colors">
                      <Lock className="w-5 h-5" />
                    </div>
                    <Input
                      type="text"
                      placeholder="Username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="pl-12 bg-black/40 border-white/5 focus:bg-black/60 focus:border-primary/50 text-white placeholder:text-zinc-600 py-6"
                      disabled={isLoading}
                    />
                  </div>
                )}
                
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-primary transition-colors">
                    <Mail className="w-5 h-5" />
                  </div>
                  <Input
                    type="email"
                    placeholder="Email Address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-12 bg-black/40 border-white/5 focus:bg-black/60 focus:border-primary/50 text-white placeholder:text-zinc-600 py-6"
                    disabled={isLoading}
                  />
                </div>

                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-zinc-500 group-focus-within:text-primary transition-colors">
                    <Lock className="w-5 h-5" />
                  </div>
                  <Input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-12 bg-black/40 border-white/5 focus:bg-black/60 focus:border-primary/50 text-white placeholder:text-zinc-600 py-6"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button 
                type="submit" 
                className="w-full py-6 text-base font-semibold tracking-wide bg-white text-black hover:bg-zinc-200 transition-all active:scale-[0.98] shadow-[0_0_20px_rgba(255,255,255,0.1)]"
                disabled={isLoading}
              >
                {isLoading ? (
                  <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin mx-auto" />
                ) : isRegister ? (
                  "CREATE ACCOUNT"
                ) : (
                  "AUTHENTICATE"
                )}
              </Button>

              <div className="relative flex items-center py-2">
                <div className="flex-grow border-t border-white/10"></div>
                <span className="flex-shrink-0 mx-4 text-zinc-500 text-xs uppercase tracking-widest">or</span>
                <div className="flex-grow border-t border-white/10"></div>
              </div>

              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 py-4 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 transition-all text-sm font-medium text-white"
              >
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                Sign in with Google
              </button>

              <p className="text-center text-zinc-500 text-sm mt-4">
                {isRegister ? "Already have an account?" : "Don't have an account?"}{" "}
                <button 
                  type="button" 
                  onClick={() => setIsRegister(!isRegister)} 
                  className="text-primary hover:text-white transition-colors"
                >
                  {isRegister ? "Sign In" : "Register Now"}
                </button>
              </p>
            </form>
          </GlassPanel>
        </motion.div>
      </div>
    </PageTransition>
  );
}
