"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged, User, signInWithEmailAndPassword, createUserWithEmailAndPassword, updateProfile, signOut, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  register: (email: string, pass: string, username: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  loginWithGoogle: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Presence logic
  useEffect(() => {
    if (!user || !db) return;

    const userRef = doc(db, "users", user.uid);
    
    const setOnline = async () => await setDoc(userRef, { isOnline: true, lastSeen: new Date().toISOString() }, { merge: true }).catch(() => {});
    const setOffline = async () => await setDoc(userRef, { isOnline: false, lastSeen: new Date().toISOString() }, { merge: true }).catch(() => {});

    setOnline();

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setOnline();
      } else {
        setOffline();
      }
    };

    const handleBeforeUnload = () => {
      setOffline();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [user]);

  const login = async (email: string, pass: string) => {
    if (!auth) return;
    await signInWithEmailAndPassword(auth, email, pass);
  };

  const register = async (email: string, pass: string, username: string) => {
    if (!auth || !db) return;
    const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
    await updateProfile(userCredential.user, { displayName: username });
    
    // Create user document in Firestore
    await setDoc(doc(db, "users", userCredential.user.uid), {
      uid: userCredential.user.uid,
      email,
      displayName: username,
      photoURL: `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
      isOnline: true,
      lastSeen: new Date().toISOString()
    });
    
    // Trigger state update
    setUser({ ...userCredential.user, displayName: username });
  };

  const logout = async () => {
    if (!auth || !user || !db) return;
    await setDoc(doc(db, "users", user.uid), { isOnline: false, lastSeen: new Date().toISOString() }, { merge: true }).catch(() => {});
    await signOut(auth);
  };

  const loginWithGoogle = async () => {
    if (!auth || !db) return;
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    
    // Check if user exists in Firestore
    const userRef = doc(db, "users", result.user.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      // Create new user document
      await setDoc(userRef, {
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName || "Google User",
        photoURL: result.user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${result.user.displayName}`,
        isOnline: true,
        lastSeen: new Date().toISOString()
      });
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
