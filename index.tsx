import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { 
  Volume2, Square, Play, RotateCcw, Zap, Info, TrendingUp, Trophy, 
  Brain, Palette, Gauge, Target, HelpCircle, XCircle, ChevronRight, 
  CheckCircle2, ArrowLeft, BarChart3, EyeOff, Calendar, Globe, 
  Flame, Star, ZapOff, Trash2
} from 'lucide-react';

// --- TYPES (Inlined) ---
type GameMode = 'position' | 'dual' | 'triple';
type GameState = 'idle' | 'playing' | 'finished' | 'analytics';
type GameSpeed = 'slow' | 'normal' | 'fast';

interface Stimulus {
  position: number;
  sound: string;
  color: string;
}

interface ModalityScore {
  correct: number;
  missed: number;
  falseAlarms: number;
  totalPossible: number;
}

interface ScoreDetails {
  position: ModalityScore;
  sound: ModalityScore;
  color: ModalityScore;
  overall: {
    percentage: number;
    totalCorrect: number;
    totalMissed: number;
    totalFalseAlarms: number;
  };
}

interface SessionRecord {
  id: string;
  date: number;
  level: number;
  mode: GameMode;
  score: number;
  xpEarned: number;
  details: ScoreDetails;
  reactionTimes: number[];
  isDaily: boolean;
}

interface ButtonFeedback {
  position: boolean;
  sound: boolean;
  color: boolean;
}

type TutorialStep = 
  | 'welcome' 
  | 'demo_step_1' 
  | 'demo_step_2' 
  | 'demo_step_3'
  | 'ready';

interface UserStats {
  xp: number;
  streak: number;
  lastPlayed: number;
  rank: string;
  bestN: number;
}

// --- CONSTANTS (Inlined) ---
const LETTERS = ['A', 'E', 'İ', 'O', 'U', 'C', 'T', 'S', 'Y'];
const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#eab308', '#a855f7', '#f97316', '#06b6d4', '#ec4899', '#f8fafc'];
const SPEED_SETTINGS: Record<string, number> = { slow: 3500, normal: 2500, fast: 1500 };
const STIMULUS_DURATION = 500;
const PHONETIC_MAP: Record<string, string> = { 'A': 'aa', 'E': 'eee', 'İ': 'iii', 'O': 'oo', 'U': 'uu', 'C': 'cee', 'T': 'tee', 'S': 'seee', 'Y': 'yee' };
const RANKS = [
  { minXp: 0, name: 'Çömez' },
  { minXp: 500, name: 'Odak Stajyeri' },
  { minXp: 1500, name: 'Zihin Mimarı' },
  { minXp: 4000, name: 'Hafıza Ustası' },
  { minXp: 10000, name: 'Nöro Grandmaster' }
];
const XP_MULTIPLIERS = { position: 1, dual: 1.5, triple: 2.2, fast: 1.3, normal: 1, slow: 0.7 };

const getSequenceLength = (level: number, isPractice: boolean): number => {
  if (isPractice) return 1000;
  if (level === 1) return 21;
  if (level === 2) return 25;
  return 30;
};

// --- SPEECH UTILS (Inlined & Fixed for Android) ---
let isAudioUnlocked = false;

// Android often "pauses" the engine silently. We force resume it.
const resumeAudio = () => {
  if (window.speechSynthesis && window.speechSynthesis.paused) {
    window.speechSynthesis.resume();
  }
};

const unlockAudio = () => {
  if (isAudioUnlocked) return;
  
  const synth = window.speechSynthesis;
  if (!synth) return;

  // On Android, 0 volume is sometimes optimized out. 0.1 ensures the audio channel opens.
  const utterance = new SpeechSynthesisUtterance(" ");
  utterance.volume = 0.1; 
  utterance.rate = 1;
  utterance.pitch = 1;
  
  resumeAudio();
  synth.cancel();
  synth.speak(utterance);
  isAudioUnlocked = true;
};

const speakLetter = (letter: string, voice?: SpeechSynthesisVoice | null) => {
  const synth = window.speechSynthesis;
  if (!synth) return;
  
  resumeAudio();

  // Crucial for Android: A tiny delay after cancel prevents the engine from crashing
  // when commands are sent too fast.
  synth.cancel();

  setTimeout(() => {
    let rate = 0.7;
    if (['A', 'O', 'U'].includes(letter)) rate = 0.85;
    else if (['E', 'İ'].includes(letter)) rate = 0.8;

    const text = PHONETIC_MAP[letter] || letter.toLowerCase();
    const utterance = new SpeechSynthesisUtterance(text);
    
    utterance.lang = 'tr-TR';
    if (voice) utterance.voice = voice;
    
    utterance.rate = rate;
    utterance.volume = 1.0;
    utterance.pitch = 1.0;
    
    utterance.onerror = (e) => {
      // If error occurs, try to reset engine
      console.warn("Audio Error", e);
      synth.cancel();
      resumeAudio();
    };

    synth.speak(utterance);
  }, 50);
};

const loadVoices = (callback: (voice: SpeechSynthesisVoice | null) => void) => {
  const synth = window.speechSynthesis;
  if (!synth) return;

  let attempts = 0;
  
  const findVoice = () => {
    const voices = synth.getVoices();
    if (voices.length > 0) {
      const turkishVoice = voices.find(v => v.lang === 'tr-TR' || v.lang === 'tr_TR') 
                        || voices.find(v => v.lang.startsWith('tr'));
      callback(turkishVoice || null);
      return true;
    }
    return false;
  };
  
  if (findVoice()) return;

  // Android loads voices asynchronously and onvoiceschanged is unreliable on some versions
  // We poll for 2 seconds to ensure we catch them when they load.
  const intervalId = setInterval(() => {
    attempts++;
    if (findVoice() || attempts > 20) {
      clearInterval(intervalId);
    }
  }, 100);

  synth.onvoiceschanged = () => {
    findVoice();
    clearInterval(intervalId);
  };
};

// --- SEQUENCE UTILS (Inlined) ---
const mulberry32 = (a: number) => () => {
  let t = a += 0x6D2B79F5;
  t = Math.imul(t ^ t >>> 15, t | 1);
  t ^= t + Math.imul(t ^ t >>> 7, t | 61);
  return ((t ^ t >>> 14) >>> 0) / 4294967296;
};

const findMatches = (seq: Stimulus[], n: number) => {
  const posMatches: number[] = [];
  const sndMatches: number[] = [];
  const colMatches: number[] = [];
  for (let i = n; i < seq.length; i++) {
    if (seq[i].position === seq[i - n].position) posMatches.push(i);
    if (seq[i].sound === seq[i - n].sound) sndMatches.push(i);
    if (seq[i].color === seq[i - n].color) colMatches.push(i);
  }
  return { posMatches, sndMatches, colMatches };
};

const preventTriplets = (seq: Stimulus[], n: number, mode: GameMode, random: () => number): Stimulus[] => {
  let matches = findMatches(seq, n);
  const modalities: ('position' | 'sound' | 'color')[] = ['position'];
  if (mode === 'dual' || mode === 'triple') modalities.push('sound');
  if (mode === 'triple') modalities.push('color');

  modalities.forEach(mod => {
    const matchKey = mod === 'position' ? 'posMatches' : mod === 'sound' ? 'sndMatches' : 'colMatches';
    let fixed = false;
    let iterations = 0;
    while (!fixed && iterations < 5) {
      fixed = true;
      matches = findMatches(seq, n);
      const currentMatches = matches[matchKey];
      for (let i = 0; i < currentMatches.length - 2; i++) {
        const idx1 = currentMatches[i];
        const idx2 = currentMatches[i + 1];
        const idx3 = currentMatches[i + 2];
        if (idx2 === idx1 + 1 && idx3 === idx2 + 1) {
          fixed = false;
          if (mod === 'position') {
            let newVal;
            do { newVal = Math.floor(random() * 9); } 
            while (newVal === seq[idx2 - n].position || newVal === seq[idx2].position);
            seq[idx2].position = newVal;
          } else if (mod === 'sound') {
            let newVal;
            do { newVal = LETTERS[Math.floor(random() * LETTERS.length)]; }
            while (newVal === seq[idx2 - n].sound || newVal === seq[idx2].sound);
            seq[idx2].sound = newVal;
          } else if (mod === 'color') {
            let newVal;
            do { newVal = COLORS[Math.floor(random() * COLORS.length)]; }
            while (newVal === seq[idx2 - n].color || newVal === seq[idx2].color);
            seq[idx2].color = newVal;
          }
        }
      }
      iterations++;
    }
  });
  return seq;
};

const generateSequence = (level: number, mode: GameMode, length: number, seed?: number): Stimulus[] => {
  const random = seed !== undefined ? mulberry32(seed) : Math.random;
  const minMatches = Math.floor(random() * 4) + 5; 
  let seq: Stimulus[] = [];
  let lastPosition = -1;
  for (let i = 0; i < length; i++) {
    let newPosition;
    do { newPosition = Math.floor(random() * 9); } 
    while (newPosition === lastPosition && random() > 0.3);
    lastPosition = newPosition;
    seq.push({
      position: newPosition,
      sound: LETTERS[Math.floor(random() * LETTERS.length)],
      color: COLORS[Math.floor(random() * COLORS.length)]
    });
  }
  seq = preventTriplets(seq, level, mode, random);
  const injectMatches = (modality: 'position' | 'sound' | 'color') => {
    let current = findMatches(seq, level);
    let attempts = 0;
    const matchKey = modality === 'position' ? 'posMatches' : modality === 'sound' ? 'sndMatches' : 'colMatches';
    while (attempts < 100 && current[matchKey].length < minMatches) {
      const available = [];
      for (let i = level; i < length; i++) {
        if (!current[matchKey].includes(i)) {
          const isPrevMatch = current[matchKey].includes(i - 1);
          const isPrevPrevMatch = current[matchKey].includes(i - 2);
          const isNextMatch = current[matchKey].includes(i + 1);
          const isNextNextMatch = current[matchKey].includes(i + 2);
          const formsTriplet = (isPrevMatch && isPrevPrevMatch) || (isPrevMatch && isNextMatch) || (isNextMatch && isNextNextMatch);
          if (!formsTriplet) available.push(i);
        }
      }
      if (available.length === 0) break;
      const randomIdx = available[Math.floor(random() * available.length)];
      if (modality === 'position') seq[randomIdx].position = seq[randomIdx - level].position;
      else if (modality === 'sound') seq[randomIdx].sound = seq[randomIdx - level].sound;
      else if (modality === 'color') seq[randomIdx].color = seq[randomIdx - level].color;
      current = findMatches(seq, level);
      attempts++;
    }
  };
  injectMatches('position');
  if (mode === 'dual' || mode === 'triple') injectMatches('sound');
  if (mode === 'triple') injectMatches('color');
  seq = preventTriplets(seq, level, mode, random);
  return seq;
};

// --- COMPONENTS ---
const NeuralMesh: React.FC<{ combo: number }> = ({ combo }) => {
  const intensity = Math.min(combo / 10, 1);
  const pulseDuration = 4 - (intensity * 3);
  const glowOpacity = 0.2 + (intensity * 0.4);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none transition-all duration-1000" style={{ opacity: glowOpacity }}>
      <svg width="100%" height="100%" className="neural-mesh">
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(99, 102, 241, 0.2)" strokeWidth="1"/>
            <circle cx="0" cy="0" r="1.5" fill="rgba(99, 102, 241, 0.4)" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
        <circle cx="20%" cy="30%" r="150" className="fill-indigo-500/10 blur-[100px]" style={{ animation: `pulse ${pulseDuration}s infinite ease-in-out` }} />
        <circle cx="80%" cy="70%" r="180" className="fill-purple-500/10 blur-[120px]" style={{ animation: `pulse ${pulseDuration + 0.5}s infinite ease-in-out` }} />
      </svg>
      <div className="absolute inset-0 transition-opacity duration-1000 bg-indigo-500/5" style={{ opacity: intensity * 0.5 }} />
    </div>
  );
};

const App: React.FC = () => {
  const [level, setLevel] = useState(1);
  const [gameMode, setGameMode] = useState<GameMode>('dual');
  const [gameState, setGameState] = useState<GameState>('idle');
  const [speed, setSpeed] = useState<GameSpeed>('normal');
  const [isPractice, setIsPractice] = useState(false);
  const [isMarathon, setIsMarathon] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [isDailyChallenge, setIsDailyChallenge] = useState(false);
  const [userStats, setUserStats] = useState<UserStats>({ xp: 0, streak: 0, lastPlayed: 0, rank: RANKS[0].name, bestN: 1 });
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [history, setHistory] = useState<SessionRecord[]>([]);
  const reactionTimes = useRef<number[]>([]);
  const [tutorialStep, setTutorialStep] = useState<TutorialStep | null>(null);
  const [tutorialActiveSquare, setTutorialActiveSquare] = useState<number | null>(null);
  const [tutorialSuccess, setTutorialSuccess] = useState(false);
  const [sequence, setSequence] = useState<Stimulus[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeStimulus, setActiveStimulus] = useState<{pos: number, col: string} | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [positionMatches, setPositionMatches] = useState<number[]>([]);
  const [soundMatches, setSoundMatches] = useState<number[]>([]);
  const [colorMatches, setColorMatches] = useState<number[]>([]);
  const userPositionInputs = useRef<number[]>([]);
  const userSoundInputs = useRef<number[]>([]);
  const userColorInputs = useRef<number[]>([]);
  const [buttonFeedback, setButtonFeedback] = useState<ButtonFeedback>({ position: false, sound: false, color: false });
  const [scoreDetails, setScoreDetails] = useState<ScoreDetails | null>(null);
  const [testSoundIndex, setTestSoundIndex] = useState(0);
  const [demoStep, setDemoStep] = useState(0);
  const [demoActive, setDemoActive] = useState<number | null>(null);
  const [demoButtonPressed, setDemoButtonPressed] = useState(false);
  const voiceRef = useRef<SpeechSynthesisVoice | null>(null);

  const triggerHaptic = (type: 'light' | 'medium' | 'success' | 'error' = 'light') => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      const patterns = { light: 15, medium: 30, success: [15, 40, 15], error: [60, 100, 60] };
      navigator.vibrate(patterns[type]);
    }
  };

  const currentRank = useMemo(() => {
    const rank = [...RANKS].reverse().find(r => userStats.xp >= r.minXp);
    return rank ? rank.name : RANKS[0].name;
  }, [userStats.xp]);

  useEffect(() => {
    if ((window as any).hideAppLoader) (window as any).hideAppLoader();
    const savedHistory = localStorage.getItem('cognivault_history');
    const savedStats = localStorage.getItem('cognivault_stats');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    if (savedStats) setUserStats(JSON.parse(savedStats));

    // Polling voice loader for Android
    loadVoices((voice) => {
      voiceRef.current = voice;
    });

    // Interaction listener to unlock audio on first touch anywhere
    const globalUnlock = () => {
      unlockAudio();
      window.removeEventListener('click', globalUnlock);
      window.removeEventListener('touchstart', globalUnlock);
    };
    window.addEventListener('click', globalUnlock);
    window.addEventListener('touchstart', globalUnlock);

    return () => {
        window.removeEventListener('click', globalUnlock);
        window.removeEventListener('touchstart', globalUnlock);
    };
  }, []);

  useEffect(() => { localStorage.setItem('cognivault_history', JSON.stringify(history)); }, [history]);
  useEffect(() => { localStorage.setItem('cognivault_stats', JSON.stringify(userStats)); }, [userStats]);

  const calculateFinalScore = useCallback((): ScoreDetails => {
    const calcMod = (inputs: number[], matches: number[]) => ({
      correct: inputs.filter(i => matches.includes(i)).length,
      missed: matches.length - inputs.filter(i => matches.includes(i)).length,
      falseAlarms: inputs.filter(i => !matches.includes(i)).length,
      totalPossible: matches.length
    });
    const pos = calcMod(userPositionInputs.current, positionMatches);
    const snd = calcMod(userSoundInputs.current, soundMatches);
    const col = calcMod(userColorInputs.current, colorMatches);
    
    const totalCorrect = pos.correct + (gameMode !== 'position' ? snd.correct : 0) + (gameMode === 'triple' ? col.correct : 0);
    const totalPossible = pos.totalPossible + (gameMode !== 'position' ? snd.totalPossible : 0) + (gameMode === 'triple' ? col.totalPossible : 0);
    const totalFalseAlarms = pos.falseAlarms + (gameMode !== 'position' ? snd.falseAlarms : 0) + (gameMode === 'triple' ? col.falseAlarms : 0);
    
    const percentage = Math.max(0, Math.round(totalPossible > 0 ? (totalCorrect / totalPossible) * 100 : 0));
    
    return { position: pos, sound: snd, color: col, overall: { percentage, totalCorrect, totalMissed: 0, totalFalseAlarms } };
  }, [gameMode, positionMatches, soundMatches, colorMatches, sequence.length]);

  const finishGame = useCallback(() => {
    window.speechSynthesis.cancel();
    const details = calculateFinalScore();
    const percentage = details.overall.percentage;
    const totalXP = Math.round(percentage * 2 * (XP_MULTIPLIERS[gameMode] || 1) * (1 + (level * 0.2)));

    const today = new Date().setHours(0,0,0,0);
    let newStreak = userStats.streak;
    if (userStats.lastPlayed === today - 86400000) newStreak += 1;
    else if (userStats.lastPlayed < today - 86400000) newStreak = 1;
    else if (userStats.lastPlayed === 0) newStreak = 1;

    const record: SessionRecord = { id: Date.now().toString(), date: Date.now(), level, mode: gameMode, score: percentage, xpEarned: totalXP, details, reactionTimes: reactionTimes.current, isDaily: isDailyChallenge };
    setHistory(prev => [record, ...prev].slice(0, 100));
    setUserStats(prev => ({ ...prev, xp: prev.xp + totalXP, streak: newStreak, lastPlayed: today, bestN: Math.max(prev.bestN, percentage > 85 ? level : prev.bestN) }));
    setScoreDetails(details);
    setGameState('finished');
    setIsPlaying(false);
    setCombo(0);
    triggerHaptic(percentage > 80 ? 'success' : 'medium');

    if (percentage >= 90 && !isPractice && !isMarathon) {
        if (level < 9) setLevel(prev => prev + 1);
        else {
            if (gameMode === 'position') { setGameMode('dual'); setLevel(1); }
            else if (gameMode === 'dual') { setGameMode('triple'); setLevel(1); }
            else setLevel(prev => prev + 1);
        }
    }
  }, [calculateFinalScore, level, gameMode, isDailyChallenge, userStats, isPractice, isMarathon]);

  const startGame = (isDaily = false) => {
    unlockAudio();
    setIsDailyChallenge(isDaily);
    const len = getSequenceLength(level, isPractice || isMarathon);
    const seed = isDaily ? new Date().setHours(0,0,0,0) : undefined;
    const seq = generateSequence(level, gameMode, len, seed);
    const matches = findMatches(seq, level);
    setSequence(seq);
    setPositionMatches(matches.posMatches);
    setSoundMatches(matches.sndMatches);
    setColorMatches(matches.colMatches);
    setCurrentIndex(0);
    setScoreDetails(null);
    setCombo(0);
    setMaxCombo(0);
    userPositionInputs.current = [];
    userSoundInputs.current = [];
    userColorInputs.current = [];
    reactionTimes.current = [];
    setGameState('playing');
    setIsPlaying(true);
    triggerHaptic('medium');
  };

  const playNextStimulus = useCallback(() => {
    if (currentIndex >= sequence.length) { finishGame(); return; }
    const current = sequence[currentIndex];
    setActiveStimulus({ pos: current.position, col: (gameMode === 'triple') ? current.color : '#6366f1' });
    if (gameMode !== 'position') speakLetter(current.sound, voiceRef.current);
    setTimeout(() => setActiveStimulus(null), STIMULUS_DURATION);
    setCurrentIndex(prev => prev + 1);
  }, [currentIndex, sequence, gameMode, finishGame]);

  useEffect(() => {
    if (!isPlaying) return;
    const timerId = setTimeout(playNextStimulus, SPEED_SETTINGS[speed]);
    return () => clearTimeout(timerId);
  }, [isPlaying, playNextStimulus, speed]);

  const handlePositionClick = () => {
    if (tutorialStep === 'demo_step_3') {
      setTutorialSuccess(true); triggerHaptic('light'); setButtonFeedback(p => ({ ...p, position: true }));
      setTimeout(() => setButtonFeedback(p => ({ ...p, position: false })), 200); return;
    }
    if (gameState !== 'playing' || currentIndex < level) return;
    const targetIdx = currentIndex - 1;
    if (userPositionInputs.current.includes(targetIdx)) return;
    const isCorrect = positionMatches.includes(targetIdx);
    userPositionInputs.current.push(targetIdx);
    triggerHaptic(isCorrect ? 'light' : 'error');
    setButtonFeedback(p => ({ ...p, position: true }));
    setTimeout(() => setButtonFeedback(p => ({ ...p, position: false })), 200);
    if (isCorrect) { setCombo(c => c + 1); setMaxCombo(m => Math.max(m, combo + 1)); }
    else { setCombo(0); if (isMarathon) finishGame(); }
  };

  const handleSoundClick = () => {
    if (gameState !== 'playing' || currentIndex < level) return;
    const targetIdx = currentIndex - 1;
    if (userSoundInputs.current.includes(targetIdx)) return;
    const isCorrect = soundMatches.includes(targetIdx);
    userSoundInputs.current.push(targetIdx);
    triggerHaptic(isCorrect ? 'light' : 'error');
    setButtonFeedback(p => ({ ...p, sound: true }));
    setTimeout(() => setButtonFeedback(p => ({ ...p, sound: false })), 200);
    if (isCorrect) { setCombo(c => c + 1); setMaxCombo(m => Math.max(m, combo + 1)); }
    else { setCombo(0); if (isMarathon) finishGame(); }
  };

  const handleColorClick = () => {
    if (gameState !== 'playing' || currentIndex < level) return;
    const targetIdx = currentIndex - 1;
    if (userColorInputs.current.includes(targetIdx)) return;
    const isCorrect = colorMatches.includes(targetIdx);
    userColorInputs.current.push(targetIdx);
    triggerHaptic(isCorrect ? 'light' : 'error');
    setButtonFeedback(p => ({ ...p, color: true }));
    setTimeout(() => setButtonFeedback(p => ({ ...p, color: false })), 200);
    if (isCorrect) { setCombo(c => c + 1); setMaxCombo(m => Math.max(m, combo + 1)); }
    else { setCombo(0); if (isMarathon) finishGame(); }
  };

  const resetGame = () => {
    window.speechSynthesis.cancel();
    setGameState('idle');
    triggerHaptic('light');
  };

  const removeAllProgress = () => {
    if (window.confirm("Tüm ilerlemeniz, TP puanlarınız ve geçmişiniz kalıcı olarak silinecektir. Emin misiniz?")) {
      localStorage.clear();
      setUserStats({ xp: 0, streak: 0, lastPlayed: 0, rank: RANKS[0].name, bestN: 1 });
      setHistory([]);
      setLevel(1);
      setGameMode('dual');
      setGameState('idle');
      triggerHaptic('error');
    }
  };

  const startTutorial = () => { 
    unlockAudio();
    setTutorialStep('welcome'); setGameState('idle'); setTutorialSuccess(false); triggerHaptic('medium'); 
  };
  
  const nextTutorialStep = () => {
    unlockAudio();
    triggerHaptic('light');
    if (tutorialStep === 'welcome') { setTutorialStep('demo_step_1'); setTutorialActiveSquare(2); }
    else if (tutorialStep === 'demo_step_1') { setTutorialStep('demo_step_2'); setTutorialActiveSquare(6); }
    else if (tutorialStep === 'demo_step_2') { setTutorialStep('demo_step_3'); setTutorialActiveSquare(6); setTutorialSuccess(false); }
    else if (tutorialStep === 'demo_step_3') { setTutorialStep('ready'); }
    else if (tutorialStep === 'ready') { setTutorialStep(null); setLevel(1); setGameMode('position'); startGame(); }
  };

  const handleTestSound = () => {
      unlockAudio();
      speakLetter(LETTERS[testSoundIndex], voiceRef.current); 
      setTestSoundIndex(p => (p + 1) % LETTERS.length); 
      triggerHaptic('light');
  };

  useEffect(() => {
    if (gameState === 'idle') {
      const demoInterval = setInterval(() => setDemoStep(prev => (prev + 1) % 5), 1500);
      return () => clearInterval(demoInterval);
    }
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'idle' && !tutorialStep) {
      const demoPos = level === 1 ? [1, 5, 7, 7, 2] : level === 2 ? [1, 5, 1, 4, 3] : [1, 4, 8, 1, 2];
      setDemoActive(demoPos[demoStep]);
      const isMatch = demoStep >= level && demoPos[demoStep] === demoPos[demoStep - level];
      if (isMatch) {
        const t = setTimeout(() => { setDemoButtonPressed(true); setTimeout(() => setDemoButtonPressed(false), 800); }, 150);
        return () => clearTimeout(t);
      }
      const t2 = setTimeout(() => setDemoActive(null), 700);
      return () => clearTimeout(t2);
    }
  }, [demoStep, gameState, level, tutorialStep]);

  const missedHeatmap = useMemo(() => {
    const map = Array(9).fill(0);
    history.slice(0, 20).forEach(h => { if (h.details.position.missed > 0) { for(let i=0; i<h.details.position.missed; i++) map[Math.floor(Math.random() * 9)]++; } });
    return map;
  }, [history]);
  const maxMiss = Math.max(...missedHeatmap, 1);

  const dynamicExplanations = useMemo(() => {
    const explanations = [];
    explanations.push({ icon: <Brain size={14} className="text-indigo-500" />, text: `N-${level} Protokolü: Mevcut uyaran ile ${level} adım öncesini karşılaştırın.` });
    if (gameMode === 'position') explanations.push({ icon: <Square size={14} className="text-blue-500" />, text: "Sadece görsel konumlara odaklanın. Ses ve renkleri görmezden gelin." });
    else if (gameMode === 'dual') explanations.push({ icon: <Volume2 size={14} className="text-purple-500" />, text: "Eş zamanlı olarak hem kare pozisyonlarını hem de harf seslerini takip edin." });
    else explanations.push({ icon: <Palette size={14} className="text-emerald-500" />, text: "Maksimum bilişsel yük: Konum, ses ve renk dizilerini ayrı ayrı eşleştirin." });
    if (speed === 'fast') explanations.push({ icon: <Zap size={14} className="text-yellow-500" />, text: "Hızlı ritim! Refleksleriniz ve anlık belleğiniz sınırda test edilecek." });
    else if (speed === 'slow') explanations.push({ icon: <Info size={14} className="text-indigo-400" />, text: "Yavaş ritim: Odaklanmak ve zihinsel imgeleme yapmak için bol vaktiniz var." });
    if (isMarathon) explanations.push({ icon: <ZapOff size={14} className="text-rose-500" />, text: "Maraton Modu: Tek bir hata veya kaçırılan eşleşme seansı sonlandırır!" });
    else if (isPractice) explanations.push({ icon: <TrendingUp size={14} className="text-emerald-500" />, text: "Alıştırma Modu: Sabit bir bitiş yok, dilediğiniz kadar pratik yapın." });
    if (isZenMode) explanations.push({ icon: <EyeOff size={14} className="text-slate-400" />, text: "Zen Modu Aktif: İlerleme çubuğu ve puanlar gizlenerek saf odak sağlanır." });
    return explanations;
  }, [level, gameMode, speed, isPractice, isMarathon, isZenMode]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none pb-[max(env(safe-area-inset-bottom),16px)] pt-[max(env(safe-area-inset-top),16px)]">
      <NeuralMesh combo={isPlaying ? combo : 0} />
      {tutorialStep && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
          <div className="bg-slate-900/80 border border-indigo-500/30 p-8 rounded-[3rem] shadow-2xl max-w-md w-full relative">
            <button onClick={() => setTutorialStep(null)} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors"><XCircle size={24} /></button>
            <div className="flex flex-col items-center">
               <div className="p-5 bg-indigo-500/20 rounded-[2rem] mb-6 shadow-inner ring-1 ring-white/10"><HelpCircle className="text-indigo-400" size={48} /></div>
               <div className="space-y-4 text-center mb-8">
                <h2 className="text-3xl font-black text-white leading-tight">
                  {tutorialStep === 'welcome' ? 'Nasıl Oynanır' : tutorialStep === 'ready' ? 'Göreve Hazır' : 'Zihin Eğitimi'}
                </h2>
                <div className="text-slate-400 text-sm leading-relaxed px-2">
                  {tutorialStep === 'welcome' && "Hoş geldiniz. Bu protokol çalışma belleği kapasitenizi hızla artırır. Kalibrasyona başlayalım."}
                  {tutorialStep === 'demo_step_1' && "N=1 için karemizen mevcut yerini aklınızda tutun. İlk konum işaretlendi."}
                  {tutorialStep === 'demo_step_2' && "Yeni bir konum işaretlendi. Şimdi bir önceki kareyle karşılaştırma yapacağız."}
                  {tutorialStep === 'demo_step_3' && (
                    <div className="flex flex-col items-center gap-4">
                      <span>N=1 modunda, mevcut kare az önceki kareyle aynı yerdeyse KONUM butonuna basın!</span>
                      {!tutorialSuccess && (
                        <button onClick={() => handlePositionClick()} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm animate-bounce shadow-lg">KONUM BUTONU</button>
                      )}
                    </div>
                  )}
                  {tutorialStep === 'ready' && "Hazırlık tamamlandı. Kontroller: A (Konum), L (Ses), S (Renk). Başarılar."}
                </div>
                {['demo_step_1', 'demo_step_2', 'demo_step_3'].includes(tutorialStep) && (
                  <div className="grid grid-cols-3 gap-2 aspect-square w-32 mx-auto p-3 bg-slate-950/80 rounded-3xl border border-white/5 shadow-2xl mt-4">
                    {[...Array(9)].map((_, i) => (
                      <div key={i} className={`rounded-xl transition-all duration-300 aspect-square ${tutorialActiveSquare === i ? 'bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.6)]' : 'bg-slate-800'}`} />
                    ))}
                  </div>
                )}
              </div>
              <button onClick={nextTutorialStep} disabled={tutorialStep === 'demo_step_3' && !tutorialSuccess} className="w-full py-5 rounded-[2rem] bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg flex items-center justify-center gap-3 transition-all active:scale-95 shadow-[0_10px_30px_rgba(79,70,229,0.3)] disabled:opacity-50">
                {tutorialStep === 'ready' ? 'Başlat' : 'Devam Et'}<ChevronRight size={22} />
              </button>
            </div>
          </div>
        </div>
      )}

      <div className={`max-w-xl w-full relative z-10 transition-all duration-700 flex flex-col ${isZenMode && isPlaying ? 'gap-0 min-h-[85vh] justify-center items-center' : 'gap-4'}`}>
        {!isPlaying && gameState !== 'finished' && (
          <div className="flex items-center justify-between px-2 mb-2 animate-in slide-in-from-top-4 duration-500 w-full">
             <div className="flex items-center gap-3 bg-slate-900/40 backdrop-blur-xl border border-white/5 py-2 px-4 rounded-2xl">
                <Flame className={`text-orange-500 ${userStats.streak > 0 ? 'fill-orange-500 animate-pulse' : ''}`} size={20} />
                <span className="text-white font-black text-sm">{userStats.streak} Gün</span>
             </div>
             <div className="flex items-center gap-3 bg-slate-900/40 backdrop-blur-xl border border-white/5 py-2 px-4 rounded-2xl">
                <Star className="text-yellow-400 fill-yellow-400" size={18} />
                <span className="text-white font-black text-sm">{userStats.xp} TP • {currentRank}</span>
             </div>
          </div>
        )}

        {(!isZenMode || !isPlaying) && gameState !== 'finished' && gameState !== 'analytics' && (
          <div className="bg-slate-900/30 backdrop-blur-3xl rounded-[2.5rem] p-6 border border-white/10 shadow-2xl transition-all duration-500 animate-in fade-in w-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-indigo-500/20 rounded-[1.5rem] shadow-lg ring-1 ring-white/10"><Brain className="text-indigo-400" size={36} /></div>
                <div><h1 className="text-3xl font-black text-white tracking-tight">Canım Anam</h1><p className="text-slate-400 text-xs font-bold uppercase tracking-widest opacity-60">Hafıza Oyunu</p></div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setGameState('analytics'); triggerHaptic('light'); }} className="p-3.5 bg-slate-800/50 rounded-2xl hover:bg-indigo-500/20 transition-all border border-white/5 active:scale-90 group"><BarChart3 size={24} className="text-indigo-400 group-hover:scale-110 transition-transform" /></button>
                <button onClick={startTutorial} className="p-3.5 bg-slate-800/50 rounded-2xl hover:bg-slate-700 transition-all border border-white/5 active:scale-90"><HelpCircle size={24} className="text-slate-400" /></button>
              </div>
            </div>
          </div>
        )}

        {gameState === 'analytics' && (
          <div className="bg-slate-900/40 backdrop-blur-3xl rounded-[3rem] p-8 border border-white/10 shadow-2xl animate-in fade-in zoom-in duration-500 w-full">
             <div className="flex items-center justify-between mb-8"><h2 className="text-2xl font-black text-white">Nöral Metrikler</h2><button onClick={() => { setGameState('idle'); triggerHaptic('light'); }} className="p-3 bg-slate-800/50 rounded-2xl text-slate-400 border border-white/5 active:scale-90"><ArrowLeft size={20} /></button></div>
              <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-slate-950/50 p-6 rounded-[2rem] border border-white/5 text-center"><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">Tepki Süresi</p><p className="text-3xl font-black text-white">{Math.round(history.reduce((a,b)=>a+(b.reactionTimes.reduce((x,y)=>x+y,0)/b.reactionTimes.length||0),0)/history.length||0)}<span className="text-xs text-indigo-400 ml-1 uppercase">ms</span></p></div>
                  <div className="bg-slate-950/50 p-6 rounded-[2rem] border border-white/5 text-center"><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">En İyi Zorluk</p><p className="text-3xl font-black text-white">N-{userStats.bestN}</p></div>
              </div>
              <div className="bg-slate-950/40 p-8 rounded-[2.5rem] border border-white/5 text-center mb-6">
                 <h3 className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em] mb-6 flex items-center justify-center gap-2"><Zap size={16} /> Dikkat Eksikliği Haritası</h3>
                 <div className="grid grid-cols-3 gap-3 aspect-square w-48 mx-auto">
                    {missedHeatmap.map((count, i) => (
                      <div key={i} className="rounded-xl border border-white/5 bg-slate-900/40 overflow-hidden relative aspect-square"><div className="absolute inset-0 bg-rose-500 transition-opacity duration-1000" style={{ opacity: (count / maxMiss) * 0.7 }} /></div>
                    ))}
                 </div>
              </div>
              <button onClick={() => { removeAllProgress(); }} className="w-full py-5 rounded-[1.5rem] bg-rose-600/10 text-rose-500 font-black text-xs flex items-center justify-center gap-2 border border-rose-500/20 active:scale-95 hover:bg-rose-600 hover:text-white transition-all shadow-lg"><Trash2 size={16} /> TÜM VERİLERİ SIFIRLA</button>
          </div>
        )}

        {gameState !== 'analytics' && gameState !== 'finished' && (
          <div className={`transition-all duration-700 w-full flex flex-col items-center ${isZenMode && isPlaying ? 'gap-12' : 'bg-slate-900/30 backdrop-blur-3xl border border-white/10 rounded-[3rem] p-8 shadow-2xl'}`}>
            {gameState === 'idle' && (
              <div className="space-y-6 mb-8 animate-in fade-in duration-500 w-full">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Target size={14} className="text-indigo-500" /> Zorluk Derecesi</label>
                    <div className="flex p-1.5 bg-slate-800/40 rounded-2xl border border-white/5">
                      {[1, 2, 3, 4, 5].map((l) => (
                        <button key={l} onClick={() => { setLevel(l); triggerHaptic('light'); }} className={`flex-1 py-2 rounded-xl font-black text-sm transition-all active:scale-90 ${level === l ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400'}`}>{l}</button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Palette size={14} className="text-purple-500" /> Oyun Modu</label>
                    <div className="flex p-1.5 bg-slate-800/40 rounded-2xl border border-white/5">
                      {(['position', 'dual', 'triple'] as GameMode[]).map((m) => (
                        <button key={m} onClick={() => { setGameMode(m); triggerHaptic('light'); }} className={`flex-1 py-2 rounded-xl font-black text-[10px] transition-all active:scale-90 ${gameMode === m ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400'}`}>{m === 'position' ? 'Konum' : m === 'dual' ? 'İkili' : 'Üçlü'}</button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><Gauge size={14} className="text-yellow-500" /> Oyun Ritmi</label>
                    <div className="flex p-1.5 bg-slate-800/40 rounded-2xl border border-white/5">
                      {(['slow', 'normal', 'fast'] as GameSpeed[]).map((s) => (
                        <button key={s} onClick={() => { setSpeed(s); triggerHaptic('light'); }} className={`flex-1 py-2 rounded-xl font-black text-[10px] transition-all active:scale-90 ${speed === s ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400'}`}>{s === 'slow' ? 'Yavaş' : s === 'normal' ? 'Normal' : 'Hızlı'}</button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2"><TrendingUp size={14} className="text-emerald-500" /> Eğitim Modu</label>
                    <div className="flex p-1.5 bg-slate-800/40 rounded-2xl border border-white/5">
                      <button onClick={() => { setIsPractice(!isPractice); setIsMarathon(false); triggerHaptic('light'); }} className={`flex-1 py-2 rounded-xl font-black text-[10px] transition-all active:scale-90 ${isPractice ? 'bg-emerald-500 text-white' : 'text-slate-400'}`}>Alıştırma</button>
                      <button onClick={() => { setIsMarathon(!isMarathon); setIsPractice(false); triggerHaptic('light'); }} className={`flex-1 py-2 rounded-xl font-black text-[10px] transition-all active:scale-90 ${isMarathon ? 'bg-rose-500 text-white' : 'text-slate-400'}`}>Maraton</button>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => { setIsZenMode(!isZenMode); triggerHaptic('light'); }} className={`flex-1 py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all active:scale-95 border ${isZenMode ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-200' : 'bg-slate-800/30 border-white/5 text-slate-400'}`}><EyeOff size={16} /> Zen Modu</button>
                  <button onClick={handleTestSound} className="flex-1 py-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 border bg-slate-800/30 border-white/5 text-slate-400 active:scale-95 transition-all"><Volume2 size={16} /> Ses Kontrol</button>
                </div>
              </div>
            )}

            {(gameState === 'idle' || gameState === 'playing') && (
              <div className={`relative flex justify-center transition-all duration-700 ${isZenMode && isPlaying ? 'scale-125 mb-16' : 'mb-8'} w-full`}>
                 <div className={`grid grid-cols-3 gap-4 aspect-square w-full max-w-[85vw] sm:max-w-[440px] p-5 bg-slate-950/40 rounded-[3rem] border-2 transition-all duration-500 ${isPlaying ? 'border-indigo-500/30 ring-8 ring-indigo-500/5 shadow-[0_0_30px_rgba(99,102,241,0.1)]' : 'border-white/5 shadow-2xl'}`}>
                    {[...Array(9)].map((_, i) => {
                      const isActive = gameState === 'idle' ? i === demoActive : activeStimulus?.pos === i;
                      const activeColor = activeStimulus?.col || '#6366f1';
                      return (<div key={i} style={{ backgroundColor: isActive ? activeColor : undefined }} className={`rounded-2xl transition-all duration-150 border transform aspect-square ${isActive ? 'scale-105 shadow-[0_0_20px_rgba(255,255,255,0.2)] ring-4 ring-white/10' : 'bg-slate-900/40 border-white/5'}`} />);
                    })}
                 </div>
              </div>
            )}

            <div className={`w-full transition-all duration-500 mx-auto ${isZenMode && isPlaying ? 'max-w-[420px] flex flex-col items-center px-4' : ''}`}>
              {gameState === 'idle' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
                  <button onClick={() => { startGame(false); }} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-6 rounded-[2rem] font-black text-2xl flex items-center justify-center gap-4 transition-all shadow-xl shadow-indigo-600/30 active:scale-95 group uppercase tracking-tight"><Play size={28} className="fill-white group-hover:scale-110 transition-transform" />Oyunu Başlat</button>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => { startGame(true); }} className="bg-emerald-600 hover:bg-emerald-500 text-white py-5 rounded-[1.5rem] font-black text-sm flex flex-col items-center justify-center gap-1 shadow-lg active:scale-95"><Calendar size={20} /> Günlük Meydan Okuma</button>
                    <button onClick={() => { setGameState('analytics'); triggerHaptic('light'); }} className="bg-slate-800 hover:bg-slate-700 text-slate-300 py-5 rounded-[1.5rem] font-black text-sm flex flex-col items-center justify-center gap-1 border border-white/10 active:scale-95"><BarChart3 size={20} /> Geçmiş</button>
                  </div>
                </div>
              )}
              {gameState === 'playing' && (
                <div className="space-y-6 w-full">
                  <div className={`grid ${gameMode === 'position' ? 'grid-cols-1' : gameMode === 'dual' ? 'grid-cols-2' : 'grid-cols-3'} gap-4 w-full`}>
                    <button onMouseDown={() => handlePositionClick()} disabled={currentIndex <= level} className={`relative rounded-[2rem] font-black transition-all border-2 active:scale-90 shadow-2xl ${buttonFeedback.position ? 'bg-indigo-400' : 'bg-indigo-600'} text-white outline-none border-transparent disabled:opacity-30 ${isZenMode && isPlaying ? 'py-12' : 'py-8'}`}><div className="flex flex-col items-center gap-2"><Square size={isZenMode && isPlaying ? 48 : 36} /><span className={`${isZenMode && isPlaying ? 'text-[13px]' : 'text-[11px]'} uppercase tracking-widest font-black`}>Konum</span></div></button>
                    {(gameMode === 'dual' || gameMode === 'triple') && (
                      <button onMouseDown={() => handleSoundClick()} disabled={currentIndex <= level} className={`relative rounded-[2rem] font-black transition-all border-2 active:scale-90 shadow-2xl ${buttonFeedback.sound ? 'bg-purple-400' : 'bg-purple-600'} text-white outline-none border-transparent disabled:opacity-30 ${isZenMode && isPlaying ? 'py-12' : 'py-8'}`}><div className="flex flex-col items-center gap-2"><Volume2 size={isZenMode && isPlaying ? 48 : 36} /><span className={`${isZenMode && isPlaying ? 'text-[13px]' : 'text-[11px]'} uppercase tracking-widest font-black`}>Ses</span></div></button>
                    )}
                    {gameMode === 'triple' && (
                      <button onMouseDown={() => handleColorClick()} disabled={currentIndex <= level} className={`relative rounded-[2rem] font-black transition-all border-2 active:scale-90 shadow-2xl ${buttonFeedback.color ? 'bg-emerald-400' : 'bg-emerald-600'} text-white outline-none border-transparent disabled:opacity-30 ${isZenMode && isPlaying ? 'py-12' : 'py-8'}`}><div className="flex flex-col items-center gap-2"><Palette size={isZenMode && isPlaying ? 48 : 36} /><span className={`${isZenMode && isPlaying ? 'text-[13px]' : 'text-[11px]'} uppercase tracking-widest font-black`}>Renk</span></div></button>
                    )}
                  </div>
                  {!isZenMode && (
                    <div className="bg-slate-950/40 p-4 rounded-[1.5rem] border border-white/5 shadow-inner">
                      <div className="flex justify-between items-center mb-2 px-1"><span className="text-slate-500 text-[10px] font-black uppercase tracking-widest">İlerleme</span><span className="text-white text-[10px] font-black bg-indigo-500/20 px-2 py-0.5 rounded-lg border border-indigo-500/20">{currentIndex} / {sequence.length}</span></div>
                      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden ring-1 ring-white/5"><div className="bg-indigo-500 h-full transition-all duration-300 shadow-[0_0_10px_rgba(99,102,241,0.4)]" style={{ width: `${(currentIndex / (sequence.length || 1)) * 100}%` }} /></div>
                    </div>
                  )}
                  <button onClick={() => { triggerHaptic('medium'); finishGame(); }} className="w-full py-4 rounded-[1.5rem] bg-slate-800/40 text-slate-500 font-black text-xs flex items-center justify-center gap-2 border border-white/5 hover:bg-slate-800 hover:text-rose-400 transition-all active:scale-95 outline-none"><ZapOff size={16} /> Oyunu Bitir</button>
                </div>
              )}
            </div>
          </div>
        )}

        {gameState === 'finished' && scoreDetails && (
          <div className="w-full max-w-xl mx-auto space-y-6 animate-in zoom-in-95 duration-500 text-center py-8">
            <div className="bg-slate-950/60 p-10 rounded-[3rem] border border-white/10 shadow-inner relative overflow-hidden w-full">
              <div className="absolute top-0 right-0 p-8 opacity-5 rotate-12"><Trophy size={140} /></div>
              <h2 className="text-3xl font-black text-indigo-400 mb-2 uppercase tracking-tight">{scoreDetails.overall.percentage >= 90 ? 'Mükemmel Seans!' : 'Seans Tamamlandı'}</h2>
              <div className="text-8xl font-black text-white my-8 tracking-tighter">{scoreDetails.overall.percentage}<span className="text-indigo-500 text-4xl">%</span></div>
              <div className="flex justify-center gap-4 text-slate-500 text-[10px] font-black uppercase tracking-[0.2em]"><span className="flex items-center gap-1"><CheckCircle2 size={12} className="text-emerald-500" /> {scoreDetails.overall.totalCorrect} DOĞRU</span><span className="flex items-center gap-1"><ZapOff size={12} className="text-rose-500" /> {scoreDetails.overall.totalFalseAlarms} HATA</span></div>
            </div>
            <button onClick={() => { resetGame(); }} className="w-full bg-indigo-600 text-white py-6 rounded-[2rem] font-black text-xl flex items-center justify-center gap-4 active:scale-95 shadow-lg group"><RotateCcw size={24} className="group-hover:rotate-180 transition-transform duration-500" /> Menüye Dön</button>
          </div>
        )}

        {(!isZenMode || !isPlaying) && gameState === 'idle' && (
          <div className="bg-slate-900/20 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/5 shadow-xl animate-in slide-in-from-bottom-4 duration-700 delay-200 w-full">
             <h3 className="text-white text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2 opacity-70"><div className="p-0.5"><Info size={14} className="text-indigo-400" /></div> Oyun Parametreleri</h3>
             <ul className="text-slate-400 text-[10px] space-y-3 font-bold leading-relaxed">
               {dynamicExplanations.map((exp, idx) => (
                 <li key={idx} className="flex items-start gap-3">
                    <div className="shrink-0">{exp.icon}</div>
                    <span>{exp.text}</span>
                 </li>
               ))}
             </ul>
          </div>
        )}
      </div>
      <style>{`
        @keyframes pulse { 0%, 100% { transform: scale(1); opacity: 0.1; } 50% { transform: scale(1.2); opacity: 0.3; } }
        .neural-mesh { mask-image: radial-gradient(circle at center, black, transparent 80%); }
        button:focus { outline: none; }
      `}</style>
    </div>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}