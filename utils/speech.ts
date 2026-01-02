
import { PHONETIC_MAP } from '../constants.ts';

export const speakLetter = (letter: string, voice?: SpeechSynthesisVoice | null) => {
  const synth = window.speechSynthesis;
  synth.cancel();

  setTimeout(() => {
    let rate = 0.7;
    if (['A', 'O', 'U'].includes(letter)) {
      rate = 0.85;
    } else if (['E', 'İ'].includes(letter)) {
      rate = 0.8;
    }

    const utterance = new SpeechSynthesisUtterance(PHONETIC_MAP[letter] || letter.toLowerCase());
    utterance.lang = 'tr-TR';
    if (voice) {
      utterance.voice = voice;
    }
    utterance.rate = rate;
    utterance.volume = 1.0;
    utterance.pitch = 1.0;
    
    synth.speak(utterance);
  }, 100);
};

export const loadVoices = (callback: (voice: SpeechSynthesisVoice | null) => void) => {
  const synth = window.speechSynthesis;
  const findVoice = () => {
    const voices = synth.getVoices();
    const turkishVoice = voices.find(v => v.lang.startsWith('tr'));
    callback(turkishVoice || null);
  };
  
  findVoice();
  if (synth.onvoiceschanged !== undefined) {
    synth.onvoiceschanged = findVoice;
  }
};
