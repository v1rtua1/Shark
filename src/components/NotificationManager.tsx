"use client";

import { useEffect, useRef } from "react";
import { useAuth } from "@/context/AuthContext";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { usePathname } from "next/navigation";

export function NotificationManager() {
  const { user } = useAuth();
  const pathname = usePathname();
  const previousChatsDataRef = useRef<any>(null);

  useEffect(() => {
    if (!user || !db) return;

    // Request Notification permission
    if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const unsub = onSnapshot(doc(db, "users", user.uid), async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const chatsData = data.chatsData || {};
        const prevChatsData = previousChatsDataRef.current;

        if (prevChatsData) {
          for (const partnerId in chatsData) {
            const currentUnread = chatsData[partnerId]?.unread || 0;
            const prevUnread = prevChatsData[partnerId]?.unread || 0;

            if (currentUnread > prevUnread) {
              // If we are currently ON this chat screen, do not notify, and optionally reset it
              if (pathname !== `/chats/${partnerId}`) {
                const message = chatsData[partnerId]?.lastMessage || "New message received";
                
                // Fetch partner name to display in notification
                let title = "New Message";
                try {
                  const partnerSnap = await getDoc(doc(db, "users", partnerId));
                  if (partnerSnap.exists()) {
                    title = `Message from ${partnerSnap.data().displayName}`;
                  }
                } catch (err) {}

                if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
                  new Notification(title, {
                    body: message,
                    icon: "/favicon.ico"
                  });
                }
              }
            }
          }
        }
        
        previousChatsDataRef.current = chatsData;
      }
    });

    return () => unsub();
  }, [user, pathname]);

  return null;
}
