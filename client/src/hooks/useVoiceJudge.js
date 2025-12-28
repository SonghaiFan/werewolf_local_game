import { useEffect } from "react";

/**
 * Handles voice cues from the server and plays them through the
 * browser speech synthesis. Only the host should speak.
 */
export function useVoiceJudge(socket, { hostId } = {}, myId) {
  useEffect(() => {
    if (typeof window === "undefined" || !socket) return;

    const speak = (text) => {
      if (!text || hostId !== myId) return;

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "zh-CN";

      const voices = window.speechSynthesis.getVoices();
      const zhVoice = voices.find(
        (voice) => voice.lang.includes("zh") || voice.lang.includes("CN")
      );
      if (zhVoice) {
        utterance.voice = zhVoice;
      }

      utterance.rate = 0.9;
      utterance.pitch = 0.8;
      window.speechSynthesis.speak(utterance);
    };

    const onVoiceCue = ({ text }) => {
      speak(text);
    };

    // Pre-warm voices
    window.speechSynthesis.getVoices();

    socket.on("voice_cue", onVoiceCue);
    return () => socket.off("voice_cue", onVoiceCue);
  }, [socket, hostId, myId]);
}
