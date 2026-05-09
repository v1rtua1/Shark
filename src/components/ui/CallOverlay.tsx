"use client";

import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from "lucide-react";
import { useCall } from "@/context/CallContext";

export function CallOverlay() {
  const { 
    currentCall, 
    localStream, 
    remoteStream, 
    isMuted, 
    isVideoOff,
    acceptCall, 
    rejectCall, 
    endCall, 
    toggleMute, 
    toggleVideo 
  } = useCall();

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const remoteAudioRef = useRef<HTMLAudioElement>(null);
  const localAudioRef = useRef<HTMLAudioElement>(null);

  const isVideoCall = currentCall?.type === "video";

  useEffect(() => {
    if (localStream) {
      if (isVideoCall && localVideoRef.current) {
        localVideoRef.current.srcObject = localStream;
        localVideoRef.current.play().catch(e => console.log("Play failed", e));
      } else if (!isVideoCall && localAudioRef.current) {
        localAudioRef.current.srcObject = localStream;
        localAudioRef.current.play().catch(e => console.log("Play failed", e));
      }
    }
  }, [localStream, currentCall?.status, isVideoCall]);

  useEffect(() => {
    if (remoteStream) {
      if (isVideoCall && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = remoteStream;
        remoteVideoRef.current.play().catch(e => console.log("Play failed", e));
      } else if (!isVideoCall && remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = remoteStream;
        remoteAudioRef.current.play().catch(e => console.log("Play failed", e));
      }
    }
  }, [remoteStream, currentCall?.status, isVideoCall]);

  if (!currentCall) return null;

  const isIncoming = currentCall.status === "ringing";
  const isVideoCall = currentCall.type === "video";

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0, scale: 1.05 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed inset-0 z-[100] bg-black flex flex-col overflow-hidden"
      >
        {/* Always-in-DOM Media Elements to bypass Mobile Autoplay Restrictions */}
        <audio ref={remoteAudioRef} autoPlay playsInline className="hidden" />
        <audio ref={localAudioRef} autoPlay playsInline muted className="hidden" />
        <video 
          ref={remoteVideoRef} 
          autoPlay 
          playsInline 
          className={`absolute inset-0 w-full h-full object-cover z-0 ${(!remoteStream || !isVideoCall || isIncoming) ? 'hidden' : 'block'}`}
        />

        {/* Background Blur for Audio or Ringing */}
        {(!remoteStream || isIncoming || !isVideoCall) && (
          <div className="absolute inset-0 z-0">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-accent/30 animate-pulse" style={{ animationDuration: '3s' }} />
            <div className="absolute inset-0 backdrop-blur-[100px] bg-black/60" />
          </div>
        )}

        {/* Remote Video Stream (Main Background) is rendered above as always-in-DOM */}

        {/* Header / Caller Info */}
        <div className="relative z-10 flex flex-col items-center pt-24 gap-4">
          {(!remoteStream || isIncoming || !isVideoCall) && (
            <motion.div 
              animate={isIncoming ? { scale: [1, 1.1, 1] } : {}} 
              transition={{ repeat: Infinity, duration: 2 }}
              className="w-32 h-32 rounded-full overflow-hidden border-4 border-white/10 shadow-2xl"
            >
              <img src={currentCall.callerPhoto || `https://api.dicebear.com/7.x/avataaars/svg?seed=${currentCall.callerName}`} alt="Caller" className="w-full h-full object-cover" />
            </motion.div>
          )}
          
          <div className="text-center">
            <h1 className="text-3xl font-bold text-white tracking-tight">{currentCall.callerName}</h1>
            <p className="text-white/60 font-medium mt-2 uppercase tracking-widest text-sm">
              {currentCall.status === "ringing" ? "Incoming Call..." : currentCall.status === "calling" ? "Calling..." : "Connected"}
            </p>
          </div>
        </div>

        {/* Local Video Stream (Picture in Picture) */}
        {localStream && isVideoCall && !isIncoming && (
          <motion.div 
            drag
            dragConstraints={{ top: 0, left: 0, right: 0, bottom: 0 }}
            className="absolute top-safe-top right-4 w-28 h-40 bg-zinc-900 rounded-2xl overflow-hidden shadow-2xl z-20 border border-white/20"
          >
            <video 
              ref={localVideoRef} 
              autoPlay 
              playsInline 
              muted 
              className="w-full h-full object-cover"
            />
          </motion.div>
        )}

        {/* Controls (Bottom) */}
        <div className="absolute bottom-0 left-0 right-0 pb-12 pt-20 px-8 bg-gradient-to-t from-black/90 to-transparent z-20 flex justify-center items-end gap-6">
          
          {isIncoming ? (
            <>
              {/* Reject Button */}
              <button 
                onClick={rejectCall}
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-xl transition-transform active:scale-95"
              >
                <PhoneOff className="w-7 h-7" />
              </button>

              {/* Accept Button */}
              <button 
                onClick={acceptCall}
                className="w-20 h-20 rounded-full bg-green-500 hover:bg-green-600 flex items-center justify-center text-white shadow-xl shadow-green-500/30 transition-transform active:scale-95 animate-bounce"
              >
                <Phone className="w-8 h-8 fill-current" />
              </button>
            </>
          ) : (
            <>
              {/* Mute Button */}
              <button 
                onClick={toggleMute}
                className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl transition-all active:scale-95 ${isMuted ? 'bg-white text-black' : 'bg-white/20 backdrop-blur-md border border-white/10 hover:bg-white/30'}`}
              >
                {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
              </button>

              {/* End Call Button */}
              <button 
                onClick={endCall}
                className="w-20 h-20 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center text-white shadow-xl shadow-red-500/30 transition-transform active:scale-95"
              >
                <PhoneOff className="w-8 h-8" />
              </button>

              {/* Video Toggle Button (Only for video calls) */}
              {isVideoCall && (
                <button 
                  onClick={toggleVideo}
                  className={`w-14 h-14 rounded-full flex items-center justify-center text-white shadow-xl transition-all active:scale-95 ${isVideoOff ? 'bg-white text-black' : 'bg-white/20 backdrop-blur-md border border-white/10 hover:bg-white/30'}`}
                >
                  {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
                </button>
              )}
            </>
          )}

        </div>
      </motion.div>
    </AnimatePresence>
  );
}
