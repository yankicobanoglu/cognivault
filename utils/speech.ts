
import { PHONETIC_MAP_TR } from '../constants.ts';
import { Language } from '../types.ts';

let isUnlocked = false;

// Android often pauses the speech engine. We must resume it before speaking.
const resumeAudio = () => {
  if (window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
  }
};

export const unlockAudio = () => {
  if (isUnlocked) return;
  
  const synth = window.speechSynthesis;
  // Create a silent, short utterance to "wake up" the engine on mobile
  const utterance = new SpeechSynthesisUtterance(" ");
  utterance.volume = 0.1; // Android ignores 0 volume sometimes, use 0.1
  utterance.rate = 1;
  utterance.pitch = 1;
  
  // Force resume before trying to unlock
  resumeAudio();
  
  synth.cancel();
  synth.speak(utterance);
  isUnlocked = true;
};

export const speakLetter = (letter: string, lang: Language, voice?: SpeechSynthesisVoice | null) => {
  const synth = window.speechSynthesis;
  
  // Ensure engine is active
  resumeAudio();

  // Cancel previous speech to prevent queue buildup, but use a tiny delay
  // because Android can crash if cancel/speak happen instantly together.
  synth.cancel();

  setTimeout(() => {
    let rate = 0.8; 
    let text = letter.toLowerCase();
    let langCode = lang === 'tr' ? 'tr-TR' : 'en-US';

    if (lang === 'tr') {
       if (['A', 'O', 'U'].includes(letter)) rate = 0.85;
       else if (['E', 'İ'].includes(letter)) rate = 0.8;
       text = PHONETIC_MAP_TR[letter] || letter.toLowerCase();
    } else {
       // Simple English adjustments if needed, though default usually works well
       rate = 0.9;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.lang = langCode;
    if (voice) {
      utterance.voice = voice;
    }
    
    utterance.rate = rate;
    utterance.volume = 1.0;
    utterance.pitch = 1.0;
    
    // Error handling for the specific utterance
    utterance.onerror = (e) => {
      console.warn("Speech error:", e);
      // Try to revive the engine if it crashes
      synth.cancel();
      resumeAudio();
    };

    synth.speak(utterance);
  }, 50); // Increased delay slightly for Android stability
};

export const loadVoices = (lang: Language, callback: (voice: SpeechSynthesisVoice | null) => void) => {
  const synth = window.speechSynthesis;
  let attempts = 0;
  
  const findVoice = () => {
    const voices = synth.getVoices();
    if (voices.length > 0) {
      let targetVoice;
      if (lang === 'tr') {
        targetVoice = voices.find(v => v.lang === 'tr-TR' || v.lang === 'tr_TR') 
                      || voices.find(v => v.lang.startsWith('tr'));
      } else {
        targetVoice = voices.find(v => v.lang === 'en-US' || v.lang === 'en_US' || v.lang === 'en-GB')
                      || voices.find(v => v.lang.startsWith('en'));
      }
      callback(targetVoice || null);
      return true;
    }
    return false;
  };
  
  // Try immediately
  if (findVoice()) return;

  // Polling fallback for Android which loads voices asynchronously without always firing onvoiceschanged correctly
  const intervalId = setInterval(() => {
    attempts++;
    if (findVoice() || attempts > 20) { // Stop after 2 seconds (20 * 100ms)
      clearInterval(intervalId);
    }
  }, 100);

  // Standard event listener
  synth.onvoiceschanged = () => {
    findVoice();
    clearInterval(intervalId);
  };
};
