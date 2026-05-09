"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { PageTransition } from "@/components/ui/PageTransition";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, UserPlus, X, Check } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { collection, onSnapshot, query, where, getDocs, doc, updateDoc, arrayUnion, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface ChatUser {
  uid: string;
  displayName: string;
  photoURL: string;
  isOnline: boolean;
  email?: string;
  lastMessage?: string;
  time?: string;
  unread?: number;
}

export default function ChatListScreen() {
  const [search, setSearch] = useState("");
  const [showAddContact, setShowAddContact] = useState(false);
  const [contactEmail, setContactEmail] = useState("");
  const [addStatus, setAddStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [addMessage, setAddMessage] = useState("");
  
  const [contacts, setContacts] = useState<string[]>([]);
  const [users, setUsers] = useState<ChatUser[]>([]);
  
  const router = useRouter();
  const { user: currentUser } = useAuth();

  // Listen to current user's contacts list
  useEffect(() => {
    if (!currentUser || !db) return;
    const unsub = onSnapshot(doc(db, "users", currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setContacts(data.contacts || []);
      }
    });
    return () => unsub();
  }, [currentUser]);

  // Listen to all users (in a real app, you'd only query the ones in contacts)
  // For simplicity here we fetch all and filter client side.
  useEffect(() => {
    if (!currentUser || !db) return;
    const q = query(collection(db, "users"), where("uid", "!=", currentUser.uid));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const usersData: ChatUser[] = [];
      snapshot.forEach((doc) => {
        usersData.push(doc.data() as ChatUser);
      });
      setUsers(usersData);
    });
    return () => unsubscribe();
  }, [currentUser]);

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contactEmail.trim() || !currentUser || !db) return;
    
    if (contactEmail.toLowerCase() === currentUser.email?.toLowerCase()) {
      setAddStatus("error");
      setAddMessage("You cannot add yourself.");
      return;
    }

    setAddStatus("loading");
    setAddMessage("");

    try {
      const q = query(collection(db, "users"), where("email", "==", contactEmail.toLowerCase()));
      const snap = await getDocs(q);
      
      if (snap.empty) {
        setAddStatus("error");
        setAddMessage("User not found.");
        return;
      }

      const targetUser = snap.docs[0].data();
      
      // Update my contacts
      await updateDoc(doc(db, "users", currentUser.uid), {
        contacts: arrayUnion(targetUser.uid)
      });
      
      // Update their contacts
      await updateDoc(doc(db, "users", targetUser.uid), {
        contacts: arrayUnion(currentUser.uid)
      });

      setAddStatus("success");
      setAddMessage(`Added ${targetUser.displayName}!`);
      setTimeout(() => {
        setShowAddContact(false);
        setContactEmail("");
        setAddStatus("idle");
      }, 2000);
      
    } catch (err: any) {
      setAddStatus("error");
      setAddMessage(err.message || "An error occurred");
    }
  };

  const filteredChats = users
    .filter(u => contacts.includes(u.uid))
    .filter(u => (u.displayName || "").toLowerCase().includes(search.toLowerCase()));

  return (
    <PageTransition className="p-4 pt-12 pb-6 min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Messages</h1>
        <button 
          onClick={() => router.push("/profile")}
          className="w-10 h-10 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center text-primary shadow-sm hover:bg-zinc-800 transition-all active:scale-95 overflow-hidden"
        >
          <img src={currentUser?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentUser?.displayName}`} alt="Profile" className="w-full h-full object-cover" />
        </button>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <div className="flex-1 relative">
          <Input 
            placeholder="Search contacts..." 
            icon={<Search className="w-5 h-5" />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-12 bg-zinc-900/40 border-zinc-800/60"
          />
        </div>
        <button 
          onClick={() => setShowAddContact(!showAddContact)}
          className={cn("w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm", showAddContact ? "bg-red-500/10 text-red-500 border border-red-500/20" : "bg-primary text-white shadow-primary/20")}
        >
          {showAddContact ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />}
        </button>
      </div>

      <AnimatePresence>
        {showAddContact && (
          <motion.div 
            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
            animate={{ opacity: 1, height: "auto", marginBottom: 24 }}
            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleAddContact} className="p-4 glass-panel rounded-2xl border border-white/5 space-y-3">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-primary" />
                Add New Contact
              </h3>
              <p className="text-xs text-zinc-400">Enter their registered email address.</p>
              
              <div className="flex gap-2">
                <Input 
                  type="email"
                  placeholder="friend@email.com"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="flex-1 h-10 text-sm"
                  disabled={addStatus === "loading" || addStatus === "success"}
                  required
                />
                <Button 
                  type="submit" 
                  disabled={addStatus === "loading" || addStatus === "success"}
                  className="h-10 px-4"
                >
                  {addStatus === "loading" ? (
                     <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : addStatus === "success" ? (
                     <Check className="w-4 h-4" />
                  ) : (
                    "Add"
                  )}
                </Button>
              </div>
              
              {addMessage && (
                <p className={cn("text-xs font-medium", addStatus === "error" ? "text-red-400" : "text-green-400")}>
                  {addMessage}
                </p>
              )}
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2">
        {filteredChats.map((chat, i) => (
          <motion.div
            key={chat.uid}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            onClick={() => router.push(`/chats/${chat.uid}`)}
            className="flex items-center gap-4 p-3 rounded-2xl hover:bg-white/5 active:scale-[0.98] transition-all cursor-pointer group"
          >
            <div className="relative">
              <div className="w-14 h-14 rounded-full bg-gradient-to-tr from-zinc-800 to-zinc-700 p-[1px]">
                <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center overflow-hidden shrink-0">
                   <img src={chat.photoURL} alt={chat.displayName} className="w-full h-full object-cover" />
                </div>
              </div>
              {chat.isOnline && (
                <div className="absolute bottom-0 right-0 w-4 h-4 rounded-full bg-accent-teal border-2 border-background animate-pulse" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-center mb-1">
                <h3 className="font-medium text-[16px] truncate pr-2 group-hover:text-primary transition-colors">{chat.displayName}</h3>
                <span className={cn("text-[11px] shrink-0", (chat.unread || 0) > 0 ? "text-primary font-medium" : "text-zinc-500")}>
                  {chat.time || "New"}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <p className="text-zinc-400 text-[14px] truncate pr-4">{chat.lastMessage || "Tap to chat securely."}</p>
                {(chat.unread || 0) > 0 && (
                  <div className="shrink-0 w-5 h-5 rounded-full bg-primary flex items-center justify-center text-[10px] font-bold text-white shadow-md shadow-primary/20">
                    {chat.unread}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        ))}
        {filteredChats.length === 0 && !showAddContact && (
          <div className="text-center text-zinc-500 mt-10 p-6 glass-panel rounded-2xl">
            <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-20" />
            <p className="font-medium text-white mb-1">No secure contacts</p>
            <p className="text-sm">Click the + button to add a contact by their email address.</p>
          </div>
        )}
      </div>
    </PageTransition>
  );
}
