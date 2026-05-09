"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { PageTransition } from "@/components/ui/PageTransition";
import { GlassPanel } from "@/components/ui/GlassPanel";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Shield, Bell, Moon, LogOut, Key, ChevronRight, ChevronLeft, Camera, Check } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { db, storage } from "@/lib/firebase";
import { doc, updateDoc, getDoc, setDoc, onSnapshot } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { updateProfile, updateEmail } from "firebase/auth";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/lib/utils";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { theme, setTheme, background, setBackground } = useTheme();
  const router = useRouter();

  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  
  // Profile Forms
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [email, setEmail] = useState(user?.email || "");
  const [disappearingMessages, setDisappearingMessages] = useState("off");
  
  // Notification States
  const [pushEnabled, setPushEnabled] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [profilePhoto, setProfilePhoto] = useState(user?.photoURL || "");

  // Toast State
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState("");
  
  // Upload State
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showSuccessToast = (msg: string) => {
    setToastMsg(msg);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  useEffect(() => {
    if (user && db) {
      const unsub = onSnapshot(doc(db, "users", user.uid), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.disappearingMessages) setDisappearingMessages(data.disappearingMessages);
          if (data.pushEnabled !== undefined) setPushEnabled(data.pushEnabled);
          if (data.soundEnabled !== undefined) setSoundEnabled(data.soundEnabled);
          if (data.photoURL) setProfilePhoto(data.photoURL);
        }
      });
      return () => unsub();
    }
  }, [user, db]);

  const handleLogout = async () => {
    await logout();
    router.push("/auth");
  };

  const toggleMenu = (menu: string) => {
    setActiveMenu(activeMenu === menu ? null : menu);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !db) return;

    setUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = async () => {
          const canvas = document.createElement('canvas');
          const MAX_SIZE = 200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_SIZE) {
              height *= MAX_SIZE / width;
              width = MAX_SIZE;
            }
          } else {
            if (height > MAX_SIZE) {
              width *= MAX_SIZE / height;
              height = MAX_SIZE;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);
          
          const base64Url = canvas.toDataURL('image/jpeg', 0.6); // Compress hard to save DB space

          try {
            // ONLY update Firestore, do NOT update Firebase Auth profile to avoid base64 length limits
            await setDoc(doc(db, "users", user.uid), { photoURL: base64Url }, { merge: true });
            showSuccessToast("Slika uspesno sacuvana!");
          } catch (err) {
            console.error(err);
            showSuccessToast("Greška pri pamćenju slike.");
            setUploadingImage(false);
          }
        };
      };
    } catch (err) {
      console.error("Failed to process image", err);
      showSuccessToast("Greška pri učitavanju fajla.");
      setUploadingImage(false);
    }
  };

  const handleSaveProfile = async () => {
    if (!user || !db) return;
    try {
      if (displayName && displayName !== user.displayName) {
        await updateProfile(user, { displayName });
        await setDoc(doc(db, "users", user.uid), { displayName }, { merge: true });
      }
      if (email && email !== user.email && email.includes("@")) {
        try {
          await updateEmail(user, email);
          await setDoc(doc(db, "users", user.uid), { email }, { merge: true });
        } catch (e: any) {
          const errMsg = e.message || "";
          if (errMsg.includes('requires-recent-login') || e.code === 'auth/requires-recent-login') {
            showSuccessToast("Moraš se izlogovati pa ulogovati ponovo da bi promenio mejl (zbog bezbednosti)!");
            return;
          }
          if (e.code === 'auth/operation-not-allowed' || errMsg.includes('verify')) {
            showSuccessToast("Isključi 'Email change requires verification' u Firebase Console -> Authentication -> Settings!");
            return;
          }
          throw e;
        }
      }
      showSuccessToast("Uspešno sačuvano!");
    } catch (error: any) {
      showSuccessToast("Greška: " + error.message);
    }
  };

  const updateDisappearingMessages = async (opt: string) => {
    setDisappearingMessages(opt);
    if (!user || !db) return;
    try {
      await setDoc(doc(db, "users", user.uid), { disappearingMessages: opt }, { merge: true });
      showSuccessToast("Opcija brisanja promenjena!");
    } catch (err: any) {
      showSuccessToast("Greška: " + err.message);
    }
  };

  const togglePush = async () => {
    if (!user || !db) return;
    if (!pushEnabled) {
      try {
        if (!("Notification" in window)) {
          showSuccessToast("Notifikacije nisu podržane.");
          return;
        }
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
          setPushEnabled(true);
          await setDoc(doc(db, "users", user.uid), { pushEnabled: true }, { merge: true });
          showSuccessToast("Push notifikacije uključene!");
        } else {
          showSuccessToast("Nemamo dozvolu za notifikacije.");
        }
      } catch (err) {
        showSuccessToast("Greška pri paljenju notifikacija.");
      }
    } else {
      setPushEnabled(false);
      await setDoc(doc(db, "users", user.uid), { pushEnabled: false }, { merge: true });
      showSuccessToast("Push notifikacije isključene!");
    }
  };

  const toggleSound = async () => {
    if (!user || !db) return;
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    try {
      await setDoc(doc(db, "users", user.uid), { soundEnabled: newState }, { merge: true });
      showSuccessToast(newState ? "Zvuk je uključen!" : "Zvuk je isključen!");
    } catch (err: any) {
      showSuccessToast("Greška: " + err.message);
    }
  };

  const requestNotifications = async () => {
    if (!("Notification" in window)) {
      alert("This browser does not support desktop notification");
      return;
    }
    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      alert("Notifications enabled!");
    }
  };

  return (
    <PageTransition className="p-4 pt-12 pb-6 min-h-screen relative overflow-hidden">
      
      {/* Foolproof CSS Toast Popup */}
      <div 
        className={cn(
          "fixed left-0 right-0 z-[999] flex justify-center px-4 transition-all duration-500 pointer-events-none",
          showToast ? "top-16 opacity-100" : "-top-20 opacity-0"
        )}
      >
        <div className="bg-black/90 backdrop-blur-xl border border-white/20 text-white px-5 py-3 rounded-full flex items-center gap-3 shadow-[0_0_40px_rgba(20,184,166,0.3)]">
          <div className="w-6 h-6 rounded-full bg-accent-teal/20 text-accent-teal flex items-center justify-center shrink-0">
            <Check className="w-4 h-4" />
          </div>
          <span className="text-[13px] font-semibold tracking-wide">{toastMsg}</span>
        </div>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/chats")} className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
      </div>

      <div className="flex flex-col items-center mb-8 pt-4">
        <div className="relative mb-4">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-primary to-accent p-1 shadow-xl shadow-primary/20 relative group">
            <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center overflow-hidden">
               <img src={profilePhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.displayName}`} alt="Profile" className="w-full h-full object-cover" />
            </div>
            
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              disabled={uploadingImage}
            >
              {uploadingImage ? <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Camera className="w-6 h-6 text-white" />}
            </button>
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
          </div>
          <div className="absolute bottom-0 right-0 p-1.5 rounded-full bg-accent-teal text-background">
            <Shield className="w-4 h-4" />
          </div>
        </div>
        <h2 className="text-xl font-bold">{user?.displayName || "Loading..."}</h2>
        <p className="text-zinc-400 text-sm">{user?.email}</p>
        
        <div className="mt-4 flex items-center gap-2 bg-accent-teal/10 text-accent-teal px-3 py-1 rounded-full text-xs font-medium border border-accent-teal/20">
          <Key className="w-3 h-3" />
          <span>End-to-End Encrypted</span>
        </div>
      </div>

      <div className="space-y-4">
        <GlassPanel variant="heavy" className="overflow-hidden">
          <div className="divide-y divide-white/5">
            {/* Account & Security */}
            <div>
              <button onClick={() => toggleMenu("account")} className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-left">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
                    <Shield className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium">Account & Security</div>
                    <div className="text-xs text-zinc-400">Keys, Privacy, Auto-delete</div>
                  </div>
                </div>
                <motion.div animate={{ rotate: activeMenu === "account" ? 90 : 0 }}>
                  <ChevronRight className="w-5 h-5 text-zinc-500" />
                </motion.div>
              </button>
              <AnimatePresence>
                {activeMenu === "account" && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="p-4 bg-black/20 space-y-4">
                      <div className="space-y-1">
                        <label className="text-xs text-zinc-400 ml-1">Display Name</label>
                        <Input value={displayName} onChange={(e) => setDisplayName(e.target.value)} />
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs text-zinc-400 ml-1">Email</label>
                        <Input value={email} onChange={(e) => setEmail(e.target.value)} />
                      </div>
                      
                      <div className="pt-2">
                        <label className="text-xs text-zinc-400 ml-1 block mb-2">Disappearing Messages</label>
                        <div className="flex p-1 bg-zinc-900 rounded-xl border border-zinc-800 flex-wrap gap-1">
                          {["off", "1_min", "1_day", "7_days", "1_month"].map((opt) => (
                            <button
                              key={opt}
                              onClick={() => updateDisappearingMessages(opt)}
                              className={`flex-1 min-w-[60px] py-2 text-[11px] font-medium rounded-lg transition-colors ${disappearingMessages === opt ? "bg-primary text-white shadow-md" : "text-zinc-400 hover:text-white"}`}
                            >
                              {opt === "off" ? "Off" : opt.replace("_", " ")}
                            </button>
                          ))}
                        </div>
                      </div>

                      <Button onClick={handleSaveProfile} className="w-full mt-2" size="sm">Save Changes</Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Notifications */}
            <div>
              <button onClick={() => toggleMenu("notifications")} className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-left">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-orange-500/10 text-orange-500 flex items-center justify-center">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium">Notifications</div>
                    <div className="text-xs text-zinc-400">Message alerts, Sounds</div>
                  </div>
                </div>
                <motion.div animate={{ rotate: activeMenu === "notifications" ? 90 : 0 }}>
                  <ChevronRight className="w-5 h-5 text-zinc-500" />
                </motion.div>
              </button>
              <AnimatePresence>
                {activeMenu === "notifications" && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="p-4 bg-black/20 space-y-4">
                      <div className="flex items-center justify-between bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
                        <div>
                          <p className="text-sm font-medium">Push Notifications</p>
                          <p className="text-[10px] text-zinc-500">Alerts when app is closed</p>
                        </div>
                        <button 
                          onClick={togglePush}
                          className={cn("w-12 h-6 rounded-full relative transition-colors duration-300", pushEnabled ? "bg-accent-teal" : "bg-black border border-white/10")}
                        >
                          <motion.div 
                            animate={{ x: pushEnabled ? 24 : 2 }} 
                            className="w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm"
                          />
                        </button>
                      </div>
                      <div className="flex items-center justify-between bg-zinc-900/50 p-3 rounded-xl border border-zinc-800">
                        <div>
                          <p className="text-sm font-medium">In-App Sounds</p>
                          <p className="text-[10px] text-zinc-500">Play sound on message</p>
                        </div>
                        <button 
                          onClick={toggleSound}
                          className={cn("w-12 h-6 rounded-full relative transition-colors duration-300", soundEnabled ? "bg-accent-teal" : "bg-black border border-white/10")}
                        >
                          <motion.div 
                            animate={{ x: soundEnabled ? 24 : 2 }} 
                            className="w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm"
                          />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Appearance */}
            <div>
              <button onClick={() => toggleMenu("appearance")} className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors text-left">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center">
                    <Moon className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="font-medium">Appearance</div>
                    <div className="text-xs text-zinc-400">Theme, Chat Background</div>
                  </div>
                </div>
                <motion.div animate={{ rotate: activeMenu === "appearance" ? 90 : 0 }}>
                  <ChevronRight className="w-5 h-5 text-zinc-500" />
                </motion.div>
              </button>
              <AnimatePresence>
                {activeMenu === "appearance" && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                    <div className="p-4 bg-black/20 space-y-5">
                       
                       <div className="space-y-2">
                         <p className="text-sm font-medium">App Theme</p>
                         <div className="flex p-1 bg-zinc-900 rounded-xl border border-zinc-800">
                           <button
                             onClick={() => { setTheme("dark"); showSuccessToast("Dark tema uključena!"); }}
                             className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${theme === "dark" ? "bg-zinc-700 text-white shadow-md" : "text-zinc-400 hover:text-white"}`}
                           >
                             Dark (Gray)
                           </button>
                           <button
                             onClick={() => { setTheme("light"); showSuccessToast("Bela tema uključena!"); }}
                             className={`flex-1 py-2 text-xs font-medium rounded-lg transition-colors ${theme === "light" ? "bg-white text-black shadow-md" : "text-zinc-400 hover:text-white"}`}
                           >
                             White Theme
                           </button>
                         </div>
                       </div>

                       <div className="space-y-2">
                         <p className="text-sm font-medium">Chat Background</p>
                         <div className="grid grid-cols-2 gap-2">
                            {["default", "neon", "space", "minimal"].map((bgOpt) => (
                               <button
                                 key={bgOpt}
                                 onClick={() => { setBackground(bgOpt as any); showSuccessToast("Pozadina uspešno promenjena!"); }}
                                 className={`py-3 text-xs font-medium rounded-xl border capitalize transition-colors ${background === bgOpt ? "border-primary bg-primary/10 text-primary" : "border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:text-white"}`}
                               >
                                 {bgOpt}
                               </button>
                            ))}
                         </div>
                       </div>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>
        </GlassPanel>

        <Button 
          variant="glass" 
          className="w-full text-red-400 hover:text-red-300 hover:bg-red-500/10 border-red-500/20"
          onClick={handleLogout}
        >
          <LogOut className="w-5 h-5 mr-2" />
          Sign Out
        </Button>
      </div>
    </PageTransition>
  );
}
