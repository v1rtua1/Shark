"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronLeft, MoreVertical, Phone, Video, Send, Paperclip, Smile, Image as ImageIcon, X } from "lucide-react";
import { MessageBubble } from "@/components/ui/MessageBubble";
import { PageTransition } from "@/components/ui/PageTransition";
import { useAuth } from "@/context/AuthContext";
import { useCall } from "@/context/CallContext";
import { cn } from "@/lib/utils";
import { db, storage } from "@/lib/firebase";
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { useTheme } from "@/context/ThemeContext";

type MessageStatus = "sending" | "sent" | "delivered" | "read";

interface Message {
  id: string;
  text: string;
  senderId: string;
  isOwn: boolean;
  time: string;
  status?: MessageStatus;
  createdAt: any;
  imageUrl?: string;
}

export default function ChatScreen() {
  const params = useParams();
  const partnerId = (params?.id as string) || "";
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const { startCall } = useCall();
  const { background } = useTheme();
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [partner, setPartner] = useState<any>(null);
  const [showEmoji, setShowEmoji] = useState(false);
  const [isPartnerTyping, setIsPartnerTyping] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [currentUserData, setCurrentUserData] = useState<any>(null);
  const [showPartnerProfile, setShowPartnerProfile] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getChatId = () => {
    if (!currentUser) return "";
    return currentUser.uid > partnerId ? `${currentUser.uid}_${partnerId}` : `${partnerId}_${currentUser.uid}`;
  };

  useEffect(() => {
    if (!db || !partnerId) return;
    const fetchPartner = async () => {
      const docSnap = await getDoc(doc(db, "users", partnerId));
      if (docSnap.exists()) {
        setPartner(docSnap.data());
      }
    };
    fetchPartner();
  }, [partnerId]);

  useEffect(() => {
    if (!currentUser || !db) return;
    const unsub = onSnapshot(doc(db!, "users", currentUser.uid), (docSnap) => {
      if (docSnap.exists()) {
        setCurrentUserData(docSnap.data());
      }
    });
    return () => unsub();
  }, [currentUser]);

  const getExpiryMs = (opt: string | undefined) => {
    if (opt === "1_min") return 60 * 1000;
    if (opt === "1_day") return 24 * 60 * 60 * 1000;
    if (opt === "7_days") return 7 * 24 * 60 * 60 * 1000;
    if (opt === "1_month") return 30 * 24 * 60 * 60 * 1000;
    return null;
  };

  useEffect(() => {
    if (!currentUser || !db) return;
    
    const chatId = getChatId();
    const q = query(
      collection(db, "chats", chatId, "messages"),
      orderBy("createdAt", "asc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        const time = data.createdAt ? new Date(data.createdAt.toMillis()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
        msgs.push({
          id: doc.id,
          text: data.text,
          senderId: data.senderId,
          isOwn: data.senderId === currentUser.uid,
          time,
          status: "sent",
          createdAt: data.createdAt,
          imageUrl: data.imageUrl
        });
      });
      setMessages(msgs);
    });

    // Listen for partner typing
    const typingRef = doc(db, "chats", chatId, "typing", partnerId);
    const unsubTyping = onSnapshot(typingRef, (doc) => {
      if (doc.exists() && doc.data().isTyping) {
        setIsPartnerTyping(true);
      } else {
        setIsPartnerTyping(false);
      }
    });

    return () => {
      unsubscribe();
      unsubTyping();
    };
  }, [currentUser, partnerId]);

  // Disappearing Messages Auto-Deletion Logic
  useEffect(() => {
    if (!db || messages.length === 0) return;
    
    const ms1 = getExpiryMs(currentUserData?.disappearingMessages);
    const ms2 = getExpiryMs(partner?.disappearingMessages);
    
    let expiryMs: number | null = null;
    if (ms1 && ms2) expiryMs = Math.min(ms1, ms2);
    else if (ms1) expiryMs = ms1;
    else if (ms2) expiryMs = ms2;

    if (!expiryMs) return;

    const interval = setInterval(() => {
      const now = Date.now();
      messages.forEach(msg => {
        if (msg.createdAt) {
          const msgTime = msg.createdAt.toMillis();
          if (now - msgTime > expiryMs!) {
            // Delete expired message permanently
            deleteDoc(doc(db!, "chats", getChatId(), "messages", msg.id)).catch(() => {});
          }
        }
      });
    }, 3000); // Check every 3 seconds

    return () => clearInterval(interval);
  }, [messages, currentUserData, partner]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isPartnerTyping]);

  // Handle local typing state to update Firestore
  useEffect(() => {
    if (!currentUser || !db) return;
    const chatId = getChatId();
    const typingRef = doc(db, "chats", chatId, "typing", currentUser.uid);
    
    if (input.length > 0) {
      setDoc(typingRef, { isTyping: true });
    } else {
      deleteDoc(typingRef).catch(() => {});
    }
    
    const timeout = setTimeout(() => {
      deleteDoc(typingRef).catch(() => {});
    }, 3000);
    
    return () => clearTimeout(timeout);
  }, [input, currentUser]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !imageFile) || !currentUser || !db) return;

    let imageUrl = "";
    if (imageFile && storage) {
      setUploadingImage(true);
      try {
        const imageRef = ref(storage, `chats/${getChatId()}/${Date.now()}_${imageFile.name}`);
        await uploadBytes(imageRef, imageFile);
        imageUrl = await getDownloadURL(imageRef);
      } catch (err) {
        console.error("Failed to upload image. Fallback to base64.", err);
        imageUrl = imagePreview || ""; // Fallback to base64 preview if Storage fails (rules/config issues)
      }
      setUploadingImage(false);
    }

    const text = input.trim();
    setInput("");
    setImageFile(null);
    setImagePreview(null);
    setShowEmoji(false);

    const chatId = getChatId();
    
    // Clear typing indicator
    deleteDoc(doc(db, "chats", chatId, "typing", currentUser.uid)).catch(() => {});

    await addDoc(collection(db, "chats", chatId, "messages"), {
      text,
      senderId: currentUser.uid,
      createdAt: serverTimestamp(),
      ...(imageUrl && { imageUrl })
    });
  };

  const bgStyles = {
    default: "",
    neon: "bg-gradient-to-br from-primary/10 via-zinc-900 to-purple-600/10",
    space: "bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] bg-black",
    minimal: "bg-black",
  };

  return (
    <PageTransition className="absolute inset-0 flex flex-col h-[100dvh] w-full overflow-hidden bg-black z-50">
      {/* Background Glows */}
      <div className="absolute top-0 left-0 w-full h-[30vh] bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />
      <div className="absolute bottom-0 right-0 w-full h-[30vh] bg-gradient-to-t from-accent/10 to-transparent pointer-events-none" />

      {/* Header */}
      <div className="flex-none pt-safe-top pb-3 px-4 z-30 flex items-center justify-between bg-black/60 backdrop-blur-2xl border-b border-white/5 shadow-xl shrink-0 gap-2">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors shrink-0">
            <ChevronLeft className="w-6 h-6" />
          </button>
          <div 
            className="flex items-center gap-3 cursor-pointer"
            onClick={() => setShowPartnerProfile(true)}
          >
            <div className="w-10 h-10 rounded-full bg-zinc-800 overflow-hidden shrink-0">
               <img src={partner?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${partnerId}`} alt="Avatar" className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-[16px] leading-tight truncate">{partner?.displayName || "Loading..."}</h2>
              <p className="text-[12px] text-accent-teal font-medium">{partner?.isOnline ? "Online" : "Offline"}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button 
            onClick={() => startCall(partnerId, partner?.displayName || "Unknown", partner?.photoURL || "", "audio")}
            className="p-2 rounded-full hover:bg-white/10 transition-colors text-zinc-400"
          >
            <Phone className="w-5 h-5" />
          </button>
          <button 
            onClick={() => startCall(partnerId, partner?.displayName || "Unknown", partner?.photoURL || "", "video")}
            className="p-2 rounded-full hover:bg-white/10 transition-colors text-zinc-400"
          >
            <Video className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden w-full px-4 py-4 scroll-smooth overscroll-none z-10 min-h-0">
        <div className="flex flex-col justify-end min-h-full">
          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                content={msg.text}
                isOwn={msg.isOwn}
                timestamp={msg.time}
                status={msg.status}
                imageUrl={msg.imageUrl}
              />
            ))}
            
            {isPartnerTyping && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                className="flex w-full mb-4 justify-start"
              >
                <div className="glass px-4 py-3 rounded-3xl rounded-bl-sm flex items-center gap-1">
                  <motion.div className="w-1.5 h-1.5 rounded-full bg-zinc-400" animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0 }} />
                  <motion.div className="w-1.5 h-1.5 rounded-full bg-zinc-400" animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }} />
                  <motion.div className="w-1.5 h-1.5 rounded-full bg-zinc-400" animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Area */}
      <div className="flex-none w-full p-4 pb-safe-bottom z-30 bg-black/60 backdrop-blur-2xl border-t border-white/5 shrink-0">
        
        <AnimatePresence>
          {showEmoji && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute bottom-[90px] left-4 z-50 shadow-2xl max-w-[calc(100vw-32px)]"
            >
              <EmojiPicker 
                theme={Theme.DARK} 
                onEmojiClick={(emoji) => setInput(prev => prev + emoji.emoji)}
                autoFocusSearch={false}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {imagePreview && (
          <div className="mb-2 relative inline-block">
            <div className="w-20 h-20 rounded-xl overflow-hidden bg-black/40 border border-white/10">
              <img src={imagePreview} className="w-full h-full object-cover" alt="Preview" />
            </div>
            <button 
              type="button" 
              onClick={() => { setImagePreview(null); setImageFile(null); }}
              className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 flex items-center justify-center text-white"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <form onSubmit={handleSend} className="flex items-end gap-2 relative max-w-md mx-auto">
          <div className="flex-1 bg-white/10 backdrop-blur-3xl border border-white/10 rounded-[24px] flex items-center pr-2 pl-4 min-h-[52px] shadow-2xl">
            <button 
              type="button" 
              onClick={() => setShowEmoji(!showEmoji)}
              className={cn("p-2 transition-colors", showEmoji ? "text-primary" : "text-zinc-400 hover:text-white")}
            >
              <Smile className="w-6 h-6" />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Message..."
              className="flex-1 bg-transparent border-none focus:outline-none px-2 py-3 text-[16px] placeholder:text-zinc-500"
            />
            {/* Disabled attachments since Storage requires billing */}
          </div>
          
          <AnimatePresence>
            {(input.trim() || imageFile) ? (
              <motion.button
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.8, opacity: 0 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                type="submit"
                disabled={uploadingImage}
                className="w-[52px] h-[52px] rounded-full bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white shadow-lg shadow-primary/20 flex-shrink-0 disabled:opacity-50"
              >
                {uploadingImage ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Send className="w-5 h-5 ml-1" />
                )}
              </motion.button>
            ) : (
               <div className="w-[52px] h-[52px] flex-shrink-0" />
            )}
          </AnimatePresence>
        </form>
      </div>

      {/* Partner Profile Modal */}
      <AnimatePresence>
        {showPartnerProfile && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex flex-col items-center justify-center p-6"
          >
            <button 
              onClick={() => setShowPartnerProfile(false)}
              className="absolute top-safe-top right-4 p-3 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
            >
              <X className="w-6 h-6 text-white" />
            </button>
            
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="w-full max-w-sm flex flex-col items-center"
            >
              <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-white/10 shadow-2xl mb-6">
                <img 
                  src={partner?.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${partnerId}`} 
                  alt="Avatar Enlarged" 
                  className="w-full h-full object-cover" 
                />
              </div>
              
              <h2 className="text-3xl font-bold text-white text-center break-words w-full px-4">{partner?.displayName || "Unknown"}</h2>
              <p className="text-zinc-400 mt-2 text-lg text-center break-words w-full px-4">{partner?.email || "No email available"}</p>
              
              <div className="mt-8 flex gap-4">
                <button 
                  onClick={() => { setShowPartnerProfile(false); startCall(partnerId, partner?.displayName || "Unknown", partner?.photoURL || "", "audio"); }}
                  className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
                >
                  <Phone className="w-7 h-7" />
                </button>
                <button 
                  onClick={() => { setShowPartnerProfile(false); startCall(partnerId, partner?.displayName || "Unknown", partner?.photoURL || "", "video"); }}
                  className="w-16 h-16 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white"
                >
                  <Video className="w-7 h-7" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

    </PageTransition>
  );
}
