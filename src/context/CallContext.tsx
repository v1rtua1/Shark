"use client";

import React, { createContext, useContext, useEffect, useState, useRef } from "react";
import { useAuth } from "./AuthContext";
import { db } from "@/lib/firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  getDoc,
  arrayUnion
} from "firebase/firestore";

type CallType = "audio" | "video";
type CallStatus = "idle" | "calling" | "ringing" | "connected" | "ended";

interface CallData {
  id: string;
  callerId: string;
  callerName: string;
  callerPhoto: string;
  receiverId: string;
  type: CallType;
  status: CallStatus;
  offer?: any;
  answer?: any;
}

interface CallContextType {
  currentCall: CallData | null;
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  isMuted: boolean;
  isVideoOff: boolean;
  startCall: (receiverId: string, receiverName: string, receiverPhoto: string, type: CallType) => Promise<void>;
  acceptCall: () => Promise<void>;
  rejectCall: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
  toggleVideo: () => void;
}

const CallContext = createContext<CallContextType | undefined>(undefined);

const servers = {
  iceServers: [
    { urls: ["stun:stun1.l.google.com:19302", "stun:stun2.l.google.com:19302"] },
    {
      urls: "turn:openrelay.metered.ca:80",
      username: "openrelayproject",
      credential: "openrelayproject"
    },
    {
      urls: "turn:openrelay.metered.ca:443",
      username: "openrelayproject",
      credential: "openrelayproject"
    }
  ]
};

export const CallProvider = ({ children }: { children: React.ReactNode }) => {
  const { user } = useAuth();
  
  const [currentCall, setCurrentCall] = useState<CallData | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const pc = useRef<RTCPeerConnection | null>(null);
  const callDocRef = useRef<any>(null);
  const isSettingRemoteDesc = useRef(false);

  // Listen for incoming calls
  useEffect(() => {
    if (!user || !db) return;

    // We use a query to find calls where we are the receiver and status is 'calling'
    // To keep it simple without composite indexes, we listen to a specific document in 'users/{uid}/incoming_call/call'
    const incomingCallRef = doc(db, "users", user.uid, "incoming_call", "call");
    
    const unsubscribe = onSnapshot(incomingCallRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as CallData;
        if (data.status === "calling" && !currentCall) {
          if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
            new Notification(`Incoming ${data.type} call`, {
              body: `${data.callerName} is calling you. Tap to answer.`,
              icon: "/favicon.ico"
            });
          }
          // Play ringtone here if needed
          setCurrentCall({ ...data, status: "ringing" });
          callDocRef.current = doc(db, "calls", data.id);
        } else if (data.status === "ended") {
          cleanupCall();
        }
      } else {
        if (currentCall && currentCall.status === "ringing") {
          cleanupCall();
        }
      }
    });

    return () => unsubscribe();
  }, [user, currentCall]);

  const setupMedia = async (type: CallType) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: type === "video",
        audio: true
      });
      setLocalStream(stream);
      return stream;
    } catch (err) {
      console.error("Error accessing media devices", err);
      alert("Please allow camera/microphone access to make calls.");
      return null;
    }
  };

  const setupPeerConnection = () => {
    const peerConnection = new RTCPeerConnection(servers);
    
    peerConnection.ontrack = (event) => {
      setRemoteStream(prevStream => {
        if (event.streams && event.streams[0]) {
          return event.streams[0];
        }
        // Fallback for browsers that don't support event.streams well
        const stream = prevStream || new MediaStream();
        stream.addTrack(event.track);
        return stream;
      });
    };

    pc.current = peerConnection;
    return peerConnection;
  };

  const startCall = async (receiverId: string, receiverName: string, receiverPhoto: string, type: CallType) => {
    if (!user || !db) return;

    const stream = await setupMedia(type);
    if (!stream) return;

    const peerConnection = setupPeerConnection();
    stream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, stream);
    });

    const callId = `${user.uid}_${Date.now()}`;
    const newCallRef = doc(db, "calls", callId);
    callDocRef.current = newCallRef;

    const callData: CallData = {
      id: callId,
      callerId: user.uid,
      callerName: user.displayName || "Unknown",
      callerPhoto: user.photoURL || "",
      receiverId,
      type,
      status: "calling"
    };

    setCurrentCall(callData);

    // Save candidate data
    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        updateDoc(newCallRef, { 
          callerCandidates: arrayUnion(event.candidate.toJSON()) 
        }).catch(e => console.error("ICE Error:", e));
      }
    };

    const offerDescription = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offerDescription);

    const callWithOffer = {
      ...callData,
      offer: {
        type: offerDescription.type,
        sdp: offerDescription.sdp,
      }
    };

    // Create call document
    await setDoc(newCallRef, callWithOffer);

    // Notify receiver
    await setDoc(doc(db, "users", receiverId, "incoming_call", "call"), callWithOffer);

    // Listen for answer
    onSnapshot(newCallRef, (snapshot) => {
      const data = snapshot.data();
      if (!peerConnection.currentRemoteDescription && data?.answer && !isSettingRemoteDesc.current) {
        isSettingRemoteDesc.current = true;
        const answerDescription = new RTCSessionDescription(data.answer);
        peerConnection.setRemoteDescription(answerDescription).then(() => {
          // Listen for remote ICE candidates AFTER remote description is set
          onSnapshot(newCallRef, (docSnap) => {
            const currentData = docSnap.data();
            if (currentData?.receiverCandidates) {
              currentData.receiverCandidates.forEach((candidateObj: any) => {
                const candidate = new RTCIceCandidate(candidateObj);
                peerConnection.addIceCandidate(candidate).catch(e => console.error(e));
              });
            }
          });
        });
        setCurrentCall(prev => prev ? { ...prev, status: "connected" } : null);
      }
      if (data?.status === "ended" || data?.status === "rejected") {
        cleanupCall();
      }
    });
  };

  const acceptCall = async () => {
    if (!user || !db || !currentCall || !callDocRef.current) return;

    const stream = await setupMedia(currentCall.type);
    if (!stream) {
      rejectCall();
      return;
    }

    const peerConnection = setupPeerConnection();
    stream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, stream);
    });

    peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        updateDoc(callDocRef.current, {
          receiverCandidates: arrayUnion(event.candidate.toJSON())
        }).catch(e => console.error("ICE Error:", e));
      }
    };

    const callDoc = await getDoc(callDocRef.current);
    const callData = callDoc.data();

    if (!callData?.offer) {
      cleanupCall();
      return;
    }

    const offerDescription = new RTCSessionDescription(callData.offer);
    await peerConnection.setRemoteDescription(offerDescription);

    const answerDescription = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answerDescription);

    const answer = {
      type: answerDescription.type,
      sdp: answerDescription.sdp,
    };

    await updateDoc(callDocRef.current, { answer, status: "connected" });
    setCurrentCall({ ...currentCall, status: "connected" });

    // Process remote ICE candidates
    onSnapshot(callDocRef.current, (docSnap) => {
      const currentData = docSnap.data();
      if (currentData?.callerCandidates) {
        currentData.callerCandidates.forEach((candidateObj: any) => {
          const candidate = new RTCIceCandidate(candidateObj);
          peerConnection.addIceCandidate(candidate).catch(e => console.error(e));
        });
      }
    });

    // Listen for end call
    onSnapshot(callDocRef.current, (snapshot) => {
      const data = snapshot.data();
      if (data?.status === "ended") {
        cleanupCall();
      }
    });
  };

  const rejectCall = async () => {
    if (!currentCall || !db || !user) {
      cleanupCall();
      return;
    }
    
    if (callDocRef.current) {
      await updateDoc(callDocRef.current, { status: "rejected" }).catch(()=> { });
    }
    await deleteDoc(doc(db, "users", user.uid, "incoming_call", "call")).catch(()=>{});
    cleanupCall();
  };

  const endCall = async () => {
    if (currentCall && callDocRef.current) {
      await updateDoc(callDocRef.current, { status: "ended" }).catch(()=>{});
    }
    
    if (currentCall && user) {
      const targetId = currentCall.callerId === user.uid ? currentCall.receiverId : currentCall.callerId;
      await deleteDoc(doc(db, "users", targetId, "incoming_call", "call")).catch(()=>{});
      await deleteDoc(doc(db, "users", user.uid, "incoming_call", "call")).catch(()=>{});
    }
    
    cleanupCall();
  };

  const cleanupCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }
    if (remoteStream) {
      remoteStream.getTracks().forEach(track => track.stop());
    }
    if (pc.current) {
      pc.current.close();
      pc.current = null;
    }
    setLocalStream(null);
    setRemoteStream(null);
    setCurrentCall(null);
    setIsMuted(false);
    setIsVideoOff(false);
    callDocRef.current = null;
    isSettingRemoteDesc.current = false;
  };

  const toggleMute = () => {
    if (localStream) {
      localStream.getAudioTracks().forEach(track => {
        track.enabled = !track.enabled;
        setIsMuted(!track.enabled);
      });
    }
  };

  const toggleVideo = async () => {
    if (!localStream) return;
    
    const videoTracks = localStream.getVideoTracks();
    if (videoTracks.length > 0) {
      videoTracks.forEach(track => {
        track.enabled = !track.enabled;
        setIsVideoOff(!track.enabled);
      });
    } else {
      if (currentCall && user) {
        alert("Prebacivanje na video poziv...");
        const targetId = currentCall.callerId === user.uid ? currentCall.receiverId : currentCall.callerId;
        const targetName = currentCall.callerId === user.uid ? "Partner" : currentCall.callerName;
        
        await endCall();
        setTimeout(() => {
          startCall(targetId, targetName, "", "video");
        }, 1500);
      }
    }
  };

  return (
    <CallContext.Provider value={{
      currentCall,
      localStream,
      remoteStream,
      isMuted,
      isVideoOff,
      startCall,
      acceptCall,
      rejectCall,
      endCall,
      toggleMute,
      toggleVideo
    }}>
      {children}
    </CallContext.Provider>
  );
};

export const useCall = () => {
  const context = useContext(CallContext);
  if (context === undefined) {
    throw new Error("useCall must be used within a CallProvider");
  }
  return context;
};
