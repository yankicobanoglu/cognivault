
import { Volume2, Square, Play, RotateCcw, Zap, Info, TrendingUp, Trophy, Brain, Palette, Gauge, Target, HelpCircle, XCircle, ChevronRight, CheckCircle2, ArrowLeft, BarChart3, Settings, EyeOff, Calendar, Globe, Flame, Star, ZapOff, Trash2, Swords, Share2 } from 'lucide-react';
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { GameMode, GameState, Stimulus, ScoreDetails, ButtonFeedback, GameSpeed, TutorialStep, ModalityScore, SessionRecord, UserStats, Language } from './types.ts';
import { getSequenceLength, SPEED_SETTINGS, STIMULUS_DURATION, LETTERS_TR, LETTERS_EN, RANKS, RANKS_EN, XP_MULTIPLIERS, TRANSLATIONS } from './constants.ts';
import { loadVoices, speakLetter } from './utils/speech.ts';
import { generateSequence, findMatches } from './utils/sequence.ts';

// Refined Flag Components
const FlagTR = ({ className = "w-full h-full" }: { className?: string }) => (
  <svg viewBox="140 0 800 800" className={className} xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
    <rect width="1200" height="800" fill="#E30A17"/>
    <circle cx="444" cy="400" r="200" fill="#ffffff"/>
    <circle cx="480" cy="400" r="160" fill="#E30A17"/>
    <path fill="#ffffff" transform="translate(628,400) rotate(-18)" d="M0,-60 L13.8,-18.8 L57.1,-18.8 L22,-5.9 L35.6,35.6 L0,10 L-35.6,35.6 L-22,-5.9 L-57.1,-18.8 L-13.8,-18.8 Z"/>
  </svg>
);

const FlagUK = ({ className = "w-full h-full" }: { className?: string }) => {
  const id = React.useId();
  return (
    <svg viewBox="15 0 30 30" className={className} xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid slice">
      <defs>
        <clipPath id={`${id}-s`}>
            <path d="M0,0 v30 h60 v-30 z"/>
        </clipPath>
        <clipPath id={`${id}-t`}>
            <path d="M30,15 h30 v15 z v15 h-30 z h-30 v-15 z v-15 h30 z"/>
        </clipPath>
      </defs>
      <g clipPath={`url(#${id}-s)`}>
    	<path d="M0,0 v30 h60 v-30 z" fill="#012169"/>
    	<path d="M0,0 L60,30 M60,0 L0,30" stroke="#fff" strokeWidth="6"/>
    	<path d="M0,0 L60,30 M60,0 L0,30" clipPath={`url(#${id}-t)`} stroke="#C8102E" strokeWidth="4"/>
    	<path d="M30,0 v30 M0,15 h60" stroke="#fff" strokeWidth="10"/>
    	<path d="M30,0 v30 M0,15 h60" stroke="#C8102E" strokeWidth="6"/>
      </g>
    </svg>
  );
};

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
        <circle 
          cx="20%" cy="30%" r="150" 
          className="fill-indigo-500/10 blur-[100px]" 
          style={{ animation: `pulse ${pulseDuration}s infinite ease-in-out` }} 
        />
        <circle 
          cx="80%" cy="70%" r="180" 
          className="fill-purple-500/10 blur-[120px]" 
          style={{ animation: `pulse ${pulseDuration + 0.5}s infinite ease-in-out` }} 
        />
      </svg>
      <div 
        className="absolute inset-0 transition-opacity duration-1000 bg-indigo-500/5" 
        style={{ opacity: intensity * 0.5 }} 
      />
    </div>
  );
};

interface IncomingChallenge {
  seed: number;
  level: number;
  mode: GameMode;
  speed: GameSpeed;
  targetScore?: number;
}

const App: React.FC = () => {
  const [language, setLanguage] = useState<Language>('en');
  const [level, setLevel] = useState(1);
  const [gameMode, setGameMode] = useState<GameMode>('position');
  const [gameState, setGameState] = useState<GameState>('idle');
  const [speed, setSpeed] = useState<GameSpeed>('normal');
  const [isPractice, setIsPractice] = useState(false);
  const [isMarathon, setIsMarathon] = useState(false);
  const [isZenMode, setIsZenMode] = useState(false);
  const [isDailyChallenge, setIsDailyChallenge] = useState(false);
  
  // Challenge State
  const [challengeSeed, setChallengeSeed] = useState<number | null>(null);
  const [isChallengeCreator, setIsChallengeCreator] = useState(false);
  const [incomingChallenge, setIncomingChallenge] = useState<IncomingChallenge | null>(null);

  const [userStats, setUserStats] = useState<UserStats>({
    xp: 0,
    streak: 0,
    lastPlayed: 0,
    rank: RANKS_EN[0].name,
    bestN: 1
  });
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);

  const [history, setHistory] = useState<SessionRecord[]>([]);
  const reactionTimes = useRef<number[]>([]);
  const currentStimulusStartTime = useRef<number>(0);

  const [tutorialStep, setTutorialStep] = useState<TutorialStep | null>(null);
  const [tutorialActiveSquare, setTutorialActiveSquare] = useState<number | null>(null);
  const [tutorialSuccess, setTutorialSuccess] = useState(false);
  const [showIntro, setShowIntro] = useState(false);
  
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
  const t = TRANSLATIONS[language];
  const currentLetters = language === 'tr' ? LETTERS_TR : LETTERS_EN;

  const triggerHaptic = (type: 'light' | 'medium' | 'success' | 'error' = 'light') => {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      const patterns = { 
        light: 15, 
        medium: 30, 
        success: [15, 40, 15], 
        error: [60, 100, 60] 
      };
      navigator.vibrate(patterns[type]);
    }
  };

  const currentRank = useMemo(() => {
    const ranks = language === 'tr' ? RANKS : RANKS_EN;
    const rank = [...ranks].reverse().find(r => userStats.xp >= r.minXp);
    return rank ? rank.name : ranks[0].name;
  }, [userStats.xp, language]);

  // Handle Dynamic Lang Attribute for CSS Uppercase logic
  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  // URL Parser for Incoming Challenges
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const cMode = params.get('type'); // 'challenge'
    
    if (cMode === 'challenge') {
      const cSeed = parseInt(params.get('seed') || '0');
      const cLevel = parseInt(params.get('level') || '1');
      const cGameMode = (params.get('mode') as GameMode) || 'position';
      const cSpeed = (params.get('speed') as GameSpeed) || 'normal';
      const cTarget = parseInt(params.get('score') || '0');

      if (cSeed) {
        setIncomingChallenge({
          seed: cSeed,
          level: cLevel,
          mode: cGameMode,
          speed: cSpeed,
          targetScore: cTarget
        });
        // Pre-set settings
        setLevel(cLevel);
        setGameMode(cGameMode);
        setSpeed(cSpeed);
        // Clear query params to clean URL (optional, but looks nicer)
        window.history.replaceState({}, '', window.location.pathname);
      }
    }
  }, []);

  useEffect(() => {
    if ((window as any).hideAppLoader) {
      (window as any).hideAppLoader();
    }

    const savedHistory = localStorage.getItem('cognivault_history');
    const savedStats = localStorage.getItem('cognivault_stats');
    const savedLang = localStorage.getItem('cognivault_lang');
    
    if (savedLang && (savedLang === 'tr' || savedLang === 'en')) {
      setLanguage(savedLang as Language);
    }

    if (savedHistory) setHistory(JSON.parse(savedHistory));
    if (savedStats) {
      const stats = JSON.parse(savedStats);
      const today = new Date().setHours(0,0,0,0);
      const yesterday = today - 86400000;
      if (stats.lastPlayed > 0 && stats.lastPlayed < yesterday) {
        stats.streak = 0;
      }
      setUserStats(stats);
    }

    if (!localStorage.getItem('has_seen_intro')) {
      setShowIntro(true);
    }
  }, []);

  useEffect(() => {
    loadVoices(language, (voice) => {
        voiceRef.current = voice;
    });
  }, [language]);

  useEffect(() => {
    localStorage.setItem('cognivault_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('cognivault_stats', JSON.stringify(userStats));
  }, [userStats]);

  const toggleLanguage = () => {
    const newLang = language === 'tr' ? 'en' : 'tr';
    setLanguage(newLang);
    localStorage.setItem('cognivault_lang', newLang);
    triggerHaptic('medium');
  };

  const setSpecificLanguage = (lang: Language) => {
    setLanguage(lang);
    localStorage.setItem('cognivault_lang', lang);
    triggerHaptic('medium');
  };

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (gameState !== 'playing') return;
    const key = e.key.toLowerCase();
    if (key === 'a') handlePositionClick();
    if (key === 'l') handleSoundClick();
    if (key === 's' && gameMode === 'triple') handleColorClick();
  }, [gameState, gameMode]);

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  const calculateScoreForModality = (inputs: number[], matches: number[], limitIndex: number): ModalityScore => {
    // Only consider matches that have occurred up to the limitIndex (when the game ended)
    const relevantMatches = matches.filter(m => m < limitIndex);
    
    // Correct: User input exists in relevant matches
    const correct = inputs.filter(i => relevantMatches.includes(i)).length;
    
    // False Alarms: User input is NOT in matches (note: standard N-back ignores future inputs usually, but here inputs are indices)
    // We should strictly look at inputs that are < limitIndex to be fair if user spams at the very end
    const relevantInputs = inputs.filter(i => i < limitIndex);
    const falseAlarms = relevantInputs.filter(i => !relevantMatches.includes(i)).length;
    
    // Missed: A match existed in the relevant range but wasn't clicked
    const missed = relevantMatches.length - correct;

    return { correct, missed, falseAlarms, totalPossible: relevantMatches.length };
  };

  const calculateFinalScore = useCallback((): ScoreDetails => {
    // Use currentIndex as the limit. If game finished naturally, currentIndex == sequence.length.
    // If exited early, currentIndex is where it stopped.
    const limit = currentIndex;

    const posScore = calculateScoreForModality(userPositionInputs.current, positionMatches, limit);
    const sndScore = calculateScoreForModality(userSoundInputs.current, soundMatches, limit);
    const colScore = calculateScoreForModality(userColorInputs.current, colorMatches, limit);

    const totalCorrect = posScore.correct + (gameMode !== 'position' ? sndScore.correct : 0) + (gameMode === 'triple' ? colScore.correct : 0);
    const totalPossible = posScore.totalPossible + (gameMode !== 'position' ? sndScore.totalPossible : 0) + (gameMode === 'triple' ? colScore.totalPossible : 0);
    const totalMissed = posScore.missed + (gameMode !== 'position' ? sndScore.missed : 0) + (gameMode === 'triple' ? colScore.missed : 0);
    const totalFalseAlarms = posScore.falseAlarms + (gameMode !== 'position' ? sndScore.falseAlarms : 0) + (gameMode === 'triple' ? colScore.falseAlarms : 0);

    const rawPercentage = totalPossible > 0 ? (totalCorrect / totalPossible) * 100 : 0;
    const percentage = Math.max(0, Math.round(rawPercentage));
    
    return {
      position: posScore,
      sound: sndScore,
      color: colScore,
      overall: { percentage, totalCorrect, totalMissed, totalFalseAlarms }
    };
  }, [gameMode, positionMatches, soundMatches, colorMatches, currentIndex]);

  const finishGame = useCallback(() => {
    window.speechSynthesis.cancel();
    const finalDetails = calculateFinalScore();
    const percentage = finalDetails.overall.percentage;
    
    const baseXP = percentage * 2;
    const modeMult = XP_MULTIPLIERS[gameMode] || 1;
    const speedMult = XP_MULTIPLIERS[speed] || 1;
    const levelMult = 1 + (level * 0.2);
    const totalXP = Math.round(baseXP * modeMult * speedMult * levelMult);

    const today = new Date().setHours(0,0,0,0);
    const yesterday = today - 86400000;
    
    let newStreak = userStats.streak;
    
    if (userStats.lastPlayed === yesterday) {
      newStreak += 1;
    } else if (userStats.lastPlayed < yesterday) {
      newStreak = 1;
    } else if (userStats.lastPlayed === 0) {
      newStreak = 1;
    }

    const record: SessionRecord = {
      id: Date.now().toString(),
      date: Date.now(),
      level,
      mode: gameMode,
      score: percentage,
      xpEarned: totalXP,
      details: finalDetails,
      reactionTimes: reactionTimes.current,
      missedPositions: positionMatches.filter(idx => !userPositionInputs.current.includes(idx)).map(idx => sequence[idx].position),
      isDaily: isDailyChallenge
    };

    setHistory(prev => [record, ...prev].slice(0, 100));
    setUserStats(prev => ({
      ...prev,
      xp: prev.xp + totalXP,
      streak: newStreak,
      lastPlayed: today,
      bestN: Math.max(prev.bestN, percentage > 85 ? level : prev.bestN)
    }));

    setScoreDetails(finalDetails);
    setGameState('finished');
    setIsPlaying(false);
    setCombo(0);
    triggerHaptic(percentage > 80 ? 'success' : 'medium');
  }, [calculateFinalScore, level, gameMode, isDailyChallenge, userStats, speed, sequence, positionMatches]);

  const startGame = (isDaily = false, isChallengeCreation = false) => {
    setIsDailyChallenge(isDaily);
    setIsChallengeCreator(isChallengeCreation);
    
    let seed: number | undefined = undefined;

    if (isDaily) {
      seed = new Date().setHours(0,0,0,0);
      setChallengeSeed(null); 
    } else if (isChallengeCreation) {
      const newSeed = Math.floor(Math.random() * 10000000);
      seed = newSeed;
      setChallengeSeed(newSeed);
    } else if (incomingChallenge && !isPractice && !isMarathon) {
       seed = incomingChallenge.seed;
       setChallengeSeed(seed);
    } else {
      setChallengeSeed(null); 
    }

    const len = getSequenceLength(level, isPractice || isMarathon);
    // Use currentLetters instead of global LETTERS
    const seq = generateSequence(level, gameMode, len, currentLetters, seed);
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
    
    if (incomingChallenge && !isChallengeCreation) {
        setIncomingChallenge(null);
    }
  };

  const playNextStimulus = useCallback(() => {
    if (isMarathon && currentIndex >= level) {
      const prevIdx = currentIndex - 1;
      const posMatch = positionMatches.includes(prevIdx);
      const sndMatch = gameMode !== 'position' && soundMatches.includes(prevIdx);
      const colMatch = gameMode === 'triple' && colorMatches.includes(prevIdx);
      
      const posMissed = posMatch && !userPositionInputs.current.includes(prevIdx);
      const sndMissed = sndMatch && !userSoundInputs.current.includes(prevIdx);
      const colMissed = colMatch && !userColorInputs.current.includes(prevIdx);

      if (posMissed || sndMissed || colMissed) {
        triggerHaptic('error');
        finishGame();
        return;
      }
    }

    if (currentIndex >= sequence.length) {
      finishGame();
      return;
    }

    const current = sequence[currentIndex];
    const displayColor = (gameMode === 'triple') ? current.color : '#6366f1'; 
    setActiveStimulus({ pos: current.position, col: displayColor });
    currentStimulusStartTime.current = Date.now();
    
    if (gameMode === 'dual' || gameMode === 'triple') {
      speakLetter(current.sound, language, voiceRef.current);
    }

    setTimeout(() => {
      setActiveStimulus(null);
    }, STIMULUS_DURATION);

    setCurrentIndex(prev => prev + 1);
  }, [currentIndex, sequence, gameMode, isMarathon, level, positionMatches, soundMatches, colorMatches, finishGame, language]);

  useEffect(() => {
    if (!isPlaying || gameState !== 'playing') return;
    const timerId = setTimeout(playNextStimulus, SPEED_SETTINGS[speed]);
    return () => clearTimeout(timerId);
  }, [isPlaying, gameState, playNextStimulus, speed]);

  const handlePositionClick = () => {
    if (tutorialStep === 'demo_step_3') {
      setTutorialSuccess(true);
      triggerHaptic('light');
      setButtonFeedback(prev => ({ ...prev, position: true }));
      setTimeout(() => setButtonFeedback(prev => ({ ...prev, position: false })), 200);
      return;
    }

    if (gameState !== 'playing' || currentIndex < level) return;
    const targetIndex = currentIndex - 1;
    const isCorrect = positionMatches.includes(targetIndex);

    if (userPositionInputs.current.includes(targetIndex)) return;
    
    userPositionInputs.current.push(targetIndex);
    triggerHaptic(isCorrect ? 'light' : 'error');
    setButtonFeedback(prev => ({ ...prev, position: true }));
    setTimeout(() => setButtonFeedback(prev => ({ ...prev, position: false })), 200);

    if (isCorrect) {
      recordReactionTime();
      const newCombo = combo + 1;
      setCombo(newCombo);
      setMaxCombo(Math.max(maxCombo, newCombo));
    } else {
      setCombo(0);
      if (isMarathon) finishGame();
    }
  };

  const handleSoundClick = () => {
    if (gameState !== 'playing' || currentIndex < level) return;
    const targetIndex = currentIndex - 1;
    const isCorrect = soundMatches.includes(targetIndex);

    if (userSoundInputs.current.includes(targetIndex)) return;

    userSoundInputs.current.push(targetIndex);
    triggerHaptic(isCorrect ? 'light' : 'error');
    setButtonFeedback(prev => ({ ...prev, sound: true }));
    setTimeout(() => setButtonFeedback(prev => ({ ...prev, sound: false })), 200);

    if (isCorrect) {
      recordReactionTime();
      const newCombo = combo + 1;
      setCombo(newCombo);
      setMaxCombo(Math.max(maxCombo, newCombo));
    } else {
      setCombo(0);
      if (isMarathon) finishGame();
    }
  };

  const handleColorClick = () => {
    if (gameState !== 'playing' || currentIndex < level) return;
    const targetIndex = currentIndex - 1;
    const isCorrect = colorMatches.includes(targetIndex);

    if (userColorInputs.current.includes(targetIndex)) return;

    userColorInputs.current.push(targetIndex);
    triggerHaptic(isCorrect ? 'light' : 'error');
    setButtonFeedback(prev => ({ ...prev, color: true }));
    setTimeout(() => setButtonFeedback(prev => ({ ...prev, color: false })), 200);

    if (isCorrect) {
      recordReactionTime();
      const newCombo = combo + 1;
      setCombo(newCombo);
      setMaxCombo(Math.max(maxCombo, newCombo));
    } else {
      setCombo(0);
      if (isMarathon) finishGame();
    }
  };
  
  const recordReactionTime = () => {
    if (currentStimulusStartTime.current > 0) {
      const now = Date.now();
      const rt = now - currentStimulusStartTime.current;
      reactionTimes.current.push(rt);
    }
  };

  const resetGame = () => {
    window.speechSynthesis.cancel();
    if (scoreDetails && scoreDetails.overall.percentage >= 90 && level < 9 && !isChallengeCreator && !incomingChallenge) {
      setLevel(prev => prev + 1);
    } else if (scoreDetails && scoreDetails.overall.percentage < 60 && level > 1 && !isChallengeCreator && !incomingChallenge) {
      setLevel(prev => prev - 1);
    }
    setGameState('idle');
    triggerHaptic('light');
    setChallengeSeed(null);
    setIsChallengeCreator(false);
  };

  const removeAllProgress = () => {
    if (window.confirm(t.resetConfirm)) {
      localStorage.clear();
      // Restore intro seen to avoid showing it again immediately after clear if desired, or let it clear.
      // Usually full reset clears everything.
      setUserStats({ xp: 0, streak: 0, lastPlayed: 0, rank: language === 'tr' ? RANKS[0].name : RANKS_EN[0].name, bestN: 1 });
      setHistory([]);
      setLevel(1);
      setGameMode('dual');
      setGameState('idle');
      triggerHaptic('error');
    }
  };

  const handleShare = async (title: string, text: string, challengeUrl?: string) => {
    const isWeb = window.location.protocol.startsWith('http');
    const shareData: any = {
      title,
      text,
    };
    
    const urlToShare = challengeUrl || window.location.href;
    if (isWeb) {
      shareData.url = urlToShare;
    }

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        if (err instanceof Error && err.name !== 'AbortError') {
             try {
                const clipboardText = `${title}\n${text}${isWeb ? `\n${urlToShare}` : ''}`;
                await navigator.clipboard.writeText(clipboardText);
                alert('Panoya kopyalandı!');
            } catch (e) {
                console.error('Clipboard failed', e);
            }
        }
      }
    } else {
      try {
        const clipboardText = `${title}\n${text}${isWeb ? `\n${urlToShare}` : ''}`;
        await navigator.clipboard.writeText(clipboardText);
        alert('Bağlantı panoya kopyalandı!');
      } catch (e) {
        console.error('Clipboard failed', e);
      }
    }
  };
  
  const createChallengeLink = () => {
    if (!scoreDetails || !challengeSeed) return;
    
    const baseUrl = window.location.href.split('?')[0];
    const params = new URLSearchParams();
    params.set('type', 'challenge');
    params.set('seed', challengeSeed.toString());
    params.set('level', level.toString());
    params.set('mode', gameMode);
    params.set('speed', speed);
    params.set('score', scoreDetails.overall.percentage.toString());
    
    const fullUrl = `${baseUrl}?${params.toString()}`;
    handleShare(
        t.challenge, 
        t.shareMsg.replace('%{score}', scoreDetails.overall.percentage.toString()).replace('%{level}', level.toString()),
        fullUrl
    );
  };

  const testSound = () => {
    speakLetter(currentLetters[testSoundIndex], language, voiceRef.current);
    setTestSoundIndex((prev) => (prev + 1) % currentLetters.length);
  };

  const startTutorial = () => {
    setTutorialStep('welcome');
    setGameState('idle');
    setTutorialSuccess(false);
    triggerHaptic('medium');
  };

  const nextTutorialStep = () => {
    triggerHaptic('light');
    if (tutorialStep === 'welcome') {
      setTutorialStep('demo_step_1');
      setTutorialActiveSquare(2);
    } else if (tutorialStep === 'demo_step_1') {
      setTutorialStep('demo_step_2');
      setTutorialActiveSquare(6);
    } else if (tutorialStep === 'demo_step_2') {
      setTutorialStep('demo_step_3');
      setTutorialActiveSquare(6);
      setTutorialSuccess(false);
    } else if (tutorialStep === 'demo_step_3') {
      setTutorialStep('ready');
    } else if (tutorialStep === 'ready') {
      setTutorialStep(null);
      setLevel(1);
      setGameMode('position');
      startGame();
    }
  };

  const dismissIntro = () => {
    localStorage.setItem('has_seen_intro', 'true');
    setShowIntro(false);
    triggerHaptic('medium');
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
    history.slice(0, 20).forEach(h => {
        if (h.missedPositions) {
            h.missedPositions.forEach(p => { if(p >= 0 && p < 9) map[p]++ });
        }
    });
    return map;
  }, [history]);
  const maxMiss = Math.max(...missedHeatmap, 1);
  const avgReactionTimeMs = history.length > 0 
  ? Math.round(
      history.reduce((acc, curr) => {
          const sessionAvg = curr.reactionTimes.length > 0 
              ? curr.reactionTimes.reduce((a, b) => a + b, 0) / curr.reactionTimes.length 
              : 0;
          return acc + sessionAvg;
      }, 0) / history.filter(h => h.reactionTimes.length > 0).length || 0
    )
  : 0;

  const avgReactionTimeSec = (avgReactionTimeMs / 1000).toFixed(2);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4 relative overflow-hidden select-none pb-[max(env(safe-area-inset-bottom),16px)] pt-[max(env(safe-area-inset-top),16px)]">
      <NeuralMesh combo={isPlaying ? combo : 0} />
      
      {/* Incoming Challenge Modal */}
      {incomingChallenge && gameState === 'idle' && !tutorialStep && !showIntro && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
          <div className="bg-slate-900/80 border border-indigo-500/30 p-8 rounded-[3rem] shadow-2xl max-w-md w-full relative">
            <div className="flex flex-col items-center">
                <div className="p-5 bg-orange-500/20 rounded-[2rem] mb-6 shadow-inner ring-1 ring-white/10 animate-pulse">
                  <Swords className="text-orange-400" size={48} />
                </div>
                <h2 className="text-2xl font-black text-white leading-tight mb-2 text-center">{t.incomingChallenge}</h2>
                <div className="text-slate-400 text-sm mb-6 text-center">
                  <span dangerouslySetInnerHTML={{ __html: t.friendScore.replace('%{score}', incomingChallenge.targetScore?.toString() || '0') }} />
                  <br/>{t.canYouBeat}
                </div>
                
                <div className="grid grid-cols-2 gap-3 w-full mb-6">
                    <div className="bg-slate-950/50 p-3 rounded-xl border border-white/5 text-center">
                        <div className="text-[10px] text-slate-500 font-bold uppercase">{t.level}</div>
                        <div className="text-xl font-black text-white">N-{incomingChallenge.level}</div>
                    </div>
                     <div className="bg-slate-950/50 p-3 rounded-xl border border-white/5 text-center">
                        <div className="text-[10px] text-slate-500 font-bold uppercase">{t.mode}</div>
                        <div className="text-xl font-black text-white capitalize">{t[incomingChallenge.mode]}</div>
                    </div>
                </div>

                <button 
                  onClick={() => startGame(false, false)}
                  className="w-full py-5 rounded-[2rem] bg-orange-600 hover:bg-orange-500 text-white font-black text-lg flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg"
                >
                  {t.acceptChallenge}
                </button>
                <button 
                  onClick={() => setIncomingChallenge(null)}
                  className="mt-4 text-slate-500 text-xs font-bold hover:text-white"
                >
                  {t.decline}
                </button>
            </div>
          </div>
        </div>
      )}

      {showIntro && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
            <div className="bg-slate-900/80 border border-indigo-500/30 p-8 rounded-[3rem] shadow-2xl max-w-md w-full relative">
              <div className="flex flex-col items-center relative">
                 {/* Language Toggle in Intro */}
                 <div className="absolute top-0 right-0 flex gap-2">
                    <button onClick={() => setSpecificLanguage('tr')} className={`w-8 h-8 rounded-full overflow-hidden transition-all ring-2 ${language === 'tr' ? 'ring-indigo-500 scale-110' : 'ring-white/10 opacity-50 hover:opacity-100'}`}>
                        <FlagTR />
                    </button>
                    <button onClick={() => setSpecificLanguage('en')} className={`w-8 h-8 rounded-full overflow-hidden transition-all ring-2 ${language === 'en' ? 'ring-indigo-500 scale-110' : 'ring-white/10 opacity-50 hover:opacity-100'}`}>
                        <FlagUK />
                    </button>
                 </div>

                 <div className="p-5 bg-indigo-500/20 rounded-[2rem] mb-6 shadow-inner ring-1 ring-white/10 mt-8">
                    <Brain className="text-indigo-400" size={48} />
                 </div>
                 <h2 className="text-3xl font-black text-white leading-tight mb-6 text-center">{t.howToPlay}</h2>
                 <div className="text-slate-400 text-sm leading-relaxed space-y-4 text-center mb-8">
                    <p>{t.intro1}</p>
                    <p>{t.intro2}</p>
                    <p>{t.intro3}</p>
                 </div>
                 <button 
                   onClick={dismissIntro}
                   className="w-full py-5 rounded-[2rem] bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg"
                 >
                   {t.gotIt} <ChevronRight size={22} />
                 </button>
              </div>
            </div>
        </div>
      )}

      {tutorialStep && (
        <div className="fixed inset-0 z-[100] bg-slate-950/90 backdrop-blur-xl flex items-center justify-center p-6 animate-in fade-in zoom-in duration-300">
          <div className="bg-slate-900/80 border border-indigo-500/30 p-8 rounded-[3rem] shadow-2xl max-w-md w-full relative">
            <button onClick={() => setTutorialStep(null)} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors">
              <XCircle size={24} />
            </button>
            <div className="flex flex-col items-center">
               <div className="p-5 bg-indigo-500/20 rounded-[2rem] mb-6 shadow-inner ring-1 ring-white/10">
                  <HelpCircle className="text-indigo-400" size={48} />
               </div>
               <div className="space-y-4 text-center mb-8">
                <h2 className="text-3xl font-black text-white leading-tight">
                  {tutorialStep === 'welcome' ? t.tutorialWelcome : tutorialStep === 'ready' ? t.tutorialReady : 'Zihin Eğitimi'}
                </h2>
                <div className="text-slate-400 text-sm leading-relaxed px-2">
                  {tutorialStep === 'welcome' && t.tutorialWelcomeText}
                  {tutorialStep === 'demo_step_1' && t.tutorialStep1}
                  {tutorialStep === 'demo_step_2' && t.tutorialStep2}
                  {tutorialStep === 'demo_step_3' && (
                     <div className="flex flex-col gap-2">
                        <p>{t.tutorialStep3Match}</p>
                     </div>
                  )}
                  {tutorialStep === 'ready' && t.tutorialReadyText}
                </div>
                {['demo_step_1', 'demo_step_2', 'demo_step_3'].includes(tutorialStep) && (
                  <div className="grid grid-cols-3 gap-2 aspect-square w-32 mx-auto p-3 bg-slate-950/80 rounded-3xl border border-white/5 shadow-2xl mt-4">
                    {[...Array(9)].map((_, i) => (
                      <div key={i} className={`rounded-xl transition-all duration-300 aspect-square ${tutorialActiveSquare === i ? 'bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.6)]' : 'bg-slate-800'}`} />
                    ))}
                  </div>
                )}
                {tutorialStep === 'demo_step_3' && !tutorialSuccess && (
                     <div className="mt-6 flex justify-center w-full">
                        <button onClick={() => handlePositionClick()} className="px-8 py-3 bg-indigo-600 text-white rounded-2xl font-black text-sm animate-bounce shadow-lg w-full max-w-[200px]">{t.tutorialBtn}</button>
                     </div>
                )}
              </div>
              <button 
                onClick={nextTutorialStep}
                disabled={tutorialStep === 'demo_step_3' && !tutorialSuccess}
                className="w-full py-5 rounded-[2rem] bg-indigo-600 hover:bg-indigo-500 text-white font-black text-lg flex items-center justify-center gap-3 transition-all active:scale-95 shadow-[0_10px_30px_rgba(79,70,229,0.3)] disabled:opacity-50"
              >
                {tutorialStep === 'ready' ? t.start : t.continue}
                <ChevronRight size={22} />
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
                <span className="text-white font-black text-sm md:text-base">{userStats.streak} {t.streak}</span>
             </div>
             <div className="flex items-center gap-3 bg-slate-900/40 backdrop-blur-xl border border-white/5 py-2 px-4 rounded-2xl">
                <Star className="text-yellow-400 fill-yellow-400" size={18} />
                <span className="text-white font-black text-sm md:text-base">{userStats.xp} {t.score} • {currentRank}</span>
             </div>
          </div>
        )}

        {gameState === 'finished' && scoreDetails && (
            <div className="w-full max-w-md animate-in fade-in zoom-in duration-300 m-auto">
                <div className="bg-slate-900/40 backdrop-blur-xl border border-white/10 p-8 rounded-[3rem] shadow-2xl flex flex-col items-center text-center">
                    <div className="p-4 bg-indigo-500/20 rounded-full mb-6 ring-1 ring-white/10 shadow-[0_0_30px_rgba(99,102,241,0.2)]">
                        <Trophy className="text-indigo-400" size={40} />
                    </div>
                    <h2 className="text-3xl font-black text-white mb-2">{t.sessionComplete}</h2>
                    <div className="flex items-center gap-2 mb-8">
                        <span className="px-3 py-1 rounded-lg bg-slate-800/50 border border-white/5 text-xs font-bold text-slate-400 uppercase tracking-widest">{t.level} {level}</span>
                        <span className="px-3 py-1 rounded-lg bg-slate-800/50 border border-white/5 text-xs font-bold text-slate-400 uppercase tracking-widest">{t[gameMode]}</span>
                    </div>
                    
                    {/* Big Score */}
                    <div className="relative mb-8">
                            <div className="text-6xl font-black text-white tracking-tighter">{scoreDetails.overall.percentage}%</div>
                            <div className="text-xs font-bold text-indigo-400 uppercase tracking-[0.2em] mt-1">{t.score}</div>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-3 w-full mb-8">
                            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex flex-col items-center">
                            <span className="text-2xl font-black text-emerald-400">{scoreDetails.overall.totalCorrect}</span>
                            <span className="text-[10px] font-black text-emerald-500/70 uppercase tracking-widest">{t.correct}</span>
                            </div>
                            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 flex flex-col items-center">
                            <span className="text-2xl font-black text-rose-400">{scoreDetails.overall.totalMissed + scoreDetails.overall.totalFalseAlarms}</span>
                            <span className="text-[10px] font-black text-rose-500/70 uppercase tracking-widest">{t.mistakes}</span>
                            </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col w-full gap-3">
                        <button onClick={() => startGame(isDailyChallenge, false)} className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all active:scale-95">
                            <RotateCcw size={18} /> {t.playAgain}
                        </button>
                        <button onClick={() => setGameState('idle')} className="w-full py-4 rounded-2xl bg-slate-800/50 hover:bg-slate-800 text-slate-400 hover:text-white font-black text-sm flex items-center justify-center gap-2 border border-white/5 transition-all active:scale-95">
                            <ArrowLeft size={18} /> {t.menu}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {(!isZenMode || !isPlaying) && gameState !== 'finished' && gameState !== 'analytics' && (
          <div className="bg-slate-900/30 backdrop-blur-3xl rounded-[2.5rem] p-6 border border-white/10 shadow-2xl transition-all duration-500 animate-in fade-in w-full">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-indigo-500/20 rounded-[1.5rem] shadow-lg ring-1 ring-white/10">
                  <Brain className="text-indigo-400" size={36} />
                </div>
                <div>
                  <h1 className="text-3xl font-black text-white tracking-tight">{t.title}</h1>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-widest opacity-60">{t.subtitle}</p>
                </div>
              </div>
              <div className="bg-slate-800/50 p-1.5 rounded-2xl border border-white/5 flex items-center gap-1">
                <button onClick={() => setGameState('analytics')} className="p-2.5 rounded-xl hover:bg-indigo-500/20 transition-all active:scale-90 text-indigo-400">
                  <BarChart3 size={20} />
                </button>
                <button onClick={startTutorial} className="p-2.5 rounded-xl hover:bg-slate-700 transition-all active:scale-90 text-slate-400">
                  <HelpCircle size={20} />
                </button>
                <button 
                    onClick={() => handleShare(t.shareTitle, t.sharePrompt)} 
                    className="p-2.5 rounded-xl hover:bg-emerald-500/20 transition-all active:scale-90 text-emerald-400"
                >
                    <Share2 size={20} />
                </button>
                <button 
                  onClick={toggleLanguage} 
                  className="p-2.5 rounded-xl hover:bg-slate-700 transition-all active:scale-90 ml-1 flex items-center justify-center"
                >
                  <div className="w-5 h-5 rounded-full overflow-hidden relative shadow-sm">
                    {language === 'tr' ? <FlagTR /> : <FlagUK />}
                  </div>
                </button>
              </div>
            </div>
          </div>
        )}

        {gameState === 'analytics' && (
          <div className="bg-slate-900/40 backdrop-blur-3xl rounded-[3rem] p-8 border border-white/10 shadow-2xl animate-in fade-in zoom-in duration-500 w-full">
             <div className="flex items-center justify-between mb-8">
                <h2 className="text-2xl font-black text-white">{t.neuralMetrics}</h2>
                <button onClick={() => setGameState('idle')} className="p-3 bg-slate-800/50 rounded-2xl text-slate-400 hover:text-white transition-all active:scale-90 border border-white/5">
                  <ArrowLeft size={20} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="bg-slate-950/50 p-6 rounded-[2rem] border border-white/5 text-center">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{t.reactionTime}</p>
                    <p className="text-3xl font-black text-white">{avgReactionTimeSec}<span className="text-xs text-indigo-400 ml-1 uppercase">sn</span></p>
                  </div>
                  <div className="bg-slate-950/50 p-6 rounded-[2rem] border border-white/5 text-center">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2">{t.bestN}</p>
                    <p className="text-3xl font-black text-white">N-{userStats.bestN}</p>
                  </div>
              </div>
              <div className="bg-slate-950/40 p-8 rounded-[2.5rem] border border-white/5 text-center mb-6">
                 <h3 className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em] mb-6 flex items-center justify-center gap-2">
                    <Zap size={16} /> {t.attentionMap}
                 </h3>
                 <div className="grid grid-cols-3 gap-3 aspect-square w-48 mx-auto">
                    {missedHeatmap.map((count, i) => (
                      <div key={i} className="rounded-xl border border-white/5 bg-slate-900/40 overflow-hidden relative aspect-square">
                         <div className="absolute inset-0 bg-rose-500 transition-opacity duration-1000" style={{ opacity: Math.min((count / (maxMiss || 1)) * 0.8, 0.9) }} />
                         {count > 0 && <div className="absolute inset-0 flex items-center justify-center text-xs font-bold text-white/50">{count}</div>}
                      </div>
                    ))}
                 </div>
              </div>
              <button 
                onClick={removeAllProgress}
                className="w-full py-4 rounded-2xl bg-rose-600/10 border border-rose-500/20 text-rose-500 font-black text-xs flex items-center justify-center gap-2 transition-all active:scale-95 hover:bg-rose-600 hover:text-white"
              >
                <Trash2 size={16} /> {t.resetData}
              </button>
          </div>
        )}

        {gameState !== 'analytics' && gameState !== 'finished' && (
          <div className={`transition-all duration-700 w-full flex flex-col items-center ${isZenMode && isPlaying ? 'bg-transparent' : 'bg-slate-900/30 backdrop-blur-3xl border border-white/10 rounded-[2rem] sm:rounded-[3rem] p-5 sm:p-8 shadow-2xl'}`}>
            
            {gameState === 'idle' && (
              <div className="space-y-6 mb-8 animate-in fade-in duration-500 w-full">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-stretch">
                  <div className="flex flex-col space-y-2 h-full">
                    <label className="text-[11px] md:text-xs font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2">
                      <Target size={14} className="text-indigo-500" /> {t.difficulty}
                    </label>
                    <div className="flex flex-1 p-1.5 bg-slate-800/40 rounded-2xl border border-white/5">
                      {[1, 2, 3, 4, 5].map((l) => (
                        <button key={l} onClick={() => { setLevel(l); triggerHaptic('light'); }} className={`flex-1 py-2 rounded-xl font-black text-sm md:text-base transition-all active:scale-90 ${level === l ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-slate-400 hover:text-white'}`}>{l}</button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2 h-full">
                    <label className="text-[11px] md:text-xs font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2">
                      <Palette size={14} className="text-purple-500" /> {t.gameMode}
                    </label>
                    <div className="flex flex-1 p-1.5 bg-slate-800/40 rounded-2xl border border-white/5">
                      {(['position', 'dual', 'triple'] as GameMode[]).map((m) => (
                        <button key={m} onClick={() => { setGameMode(m); triggerHaptic('light'); }} className={`flex-1 min-w-0 py-2 rounded-xl font-black text-[10px] md:text-xs transition-all active:scale-90 ${gameMode === m ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400'}`}>
                          {t[m]}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 items-stretch">
                  <div className="flex flex-col space-y-2 h-full">
                    <label className="text-[11px] md:text-xs font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2">
                      <Gauge size={14} className="text-yellow-500" /> {t.speed}
                    </label>
                    <div className="flex flex-1 p-1.5 bg-slate-800/40 rounded-2xl border border-white/5">
                      {(['slow', 'normal', 'fast'] as GameSpeed[]).map((s) => (
                        <button key={s} onClick={() => { setSpeed(s); triggerHaptic('light'); }} className={`flex-1 py-2 rounded-xl font-black text-[10px] md:text-xs transition-all active:scale-90 ${speed === s ? 'bg-indigo-500 text-white shadow-lg' : 'text-slate-400'}`}>
                          {t[s]}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex flex-col space-y-2 h-full">
                    <label className="text-[11px] md:text-xs font-black text-slate-500 uppercase tracking-widest px-1 flex items-center gap-2">
                      <TrendingUp size={14} className="text-emerald-500" /> {t.trainingMode}
                    </label>
                    <div className="flex flex-1 p-1.5 bg-slate-800/40 rounded-2xl border border-white/5 gap-1">
                      <button onClick={() => { setIsPractice(false); setIsMarathon(false); triggerHaptic('light'); }} className={`flex-1 py-2 rounded-xl font-black text-[10px] md:text-xs transition-all active:scale-90 ${!isPractice && !isMarathon ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400'}`}>{t.standard}</button>
                      <button onClick={() => { setIsPractice(true); setIsMarathon(false); triggerHaptic('light'); }} className={`flex-1 py-2 rounded-xl font-black text-[10px] md:text-xs transition-all active:scale-90 ${isPractice ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'text-slate-400'}`}>{t.practice}</button>
                      <button onClick={() => { setIsMarathon(true); setIsPractice(false); triggerHaptic('light'); }} className={`flex-1 py-2 rounded-xl font-black text-[10px] md:text-xs transition-all active:scale-90 ${isMarathon ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/20' : 'text-slate-400'}`}>{t.marathon}</button>
                    </div>
                  </div>
                </div>
                <div className="flex gap-4">
                  <button onClick={() => setIsZenMode(!isZenMode)} className={`flex-1 py-4 rounded-2xl font-black text-xs md:text-sm flex items-center justify-center gap-2 transition-all active:scale-95 border ${isZenMode ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-200' : 'bg-slate-800/30 border-white/5 text-slate-400'}`}>
                    <EyeOff size={16} /> {t.zenMode}
                  </button>
                  <button onClick={testSound} className="flex-1 py-4 rounded-2xl font-black text-xs md:text-sm flex items-center justify-center gap-2 transition-all active:scale-95 border bg-slate-800/30 border-white/5 text-slate-400">
                    <Volume2 size={16} /> {t.soundCheck}
                  </button>
                </div>
              </div>
            )}

            {(gameState === 'idle' || gameState === 'playing') && (
              <div className={`relative flex justify-center transition-all duration-700 ${isZenMode && isPlaying ? 'flex-1 items-center mb-0' : 'mb-8'} w-full`}>
                 <div className={`grid grid-cols-3 gap-4 aspect-square w-full transition-all duration-500 ${isZenMode && isPlaying ? 'w-full max-w-[min(90vw,60vh)] p-8 bg-transparent' : 'max-w-[420px] md:max-w-[500px] p-5 bg-slate-950/40 rounded-[3rem] border-2 border-white/5 shadow-2xl'} ${isPlaying && !isZenMode ? 'border-indigo-500/30 ring-8 ring-indigo-500/5 shadow-[0_0_30px_rgba(99,102,241,0.1)]' : ''}`}>
                    {[...Array(9)].map((_, i) => {
                      const isActive = gameState === 'idle' ? i === demoActive : activeStimulus?.pos === i;
                      const activeColor = activeStimulus?.col || '#6366f1';
                      return (
                        <div key={i} style={{ backgroundColor: isActive ? activeColor : undefined }} className={`rounded-2xl transition-all duration-150 border transform aspect-square ${isActive ? 'scale-105 shadow-[0_0_20px_rgba(255,255,255,0.2)] ring-4 ring-white/10' : 'bg-slate-900/40 border-white/5'}`} />
                      );
                    })}
                 </div>
              </div>
            )}

            <div className={`transition-all duration-500 w-full ${isZenMode && isPlaying ? 'hidden' : 'max-w-[420px] flex flex-col items-center px-4'}`}>
              {gameState === 'idle' && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 w-full">
                  <button onClick={() => startGame(false)} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-6 rounded-[2rem] font-black text-2xl md:text-3xl flex items-center justify-center gap-4 transition-all shadow-xl shadow-indigo-600/30 active:scale-95 group">
                    <Play size={28} className="fill-white group-hover:scale-110 transition-transform" />
                    {t.startGame}
                  </button>
                  <div className="flex gap-4">
                      <button onClick={() => startGame(true)} className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-5 rounded-[1.5rem] font-black text-xs md:text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95">
                        <Calendar size={18} /> {t.dailyRace}
                      </button>
                      <button onClick={() => startGame(false, true)} className="flex-1 bg-orange-600 hover:bg-orange-500 text-white py-5 rounded-[1.5rem] font-black text-xs md:text-sm flex items-center justify-center gap-2 shadow-lg active:scale-95">
                        <Swords size={18} /> {t.challenge}
                      </button>
                  </div>
                </div>
              )}

              {gameState === 'playing' && (
                <div className="space-y-6 w-full">
                  <div className={`grid ${gameMode === 'position' ? 'grid-cols-1' : gameMode === 'dual' ? 'grid-cols-2' : 'grid-cols-3'} gap-4 w-full`}>
                    <button 
                      onMouseDown={handlePositionClick} 
                      disabled={currentIndex <= level} 
                      className={`relative rounded-[2rem] font-black transition-all border-2 active:scale-90 shadow-2xl ${buttonFeedback.position ? 'bg-indigo-400 border-white/40' : 'bg-indigo-600 border-transparent'} text-white disabled:opacity-30 py-8`}
                    >
                      <div className="flex flex-col items-center gap-2">
                        <Square size={36} />
                        <span className={`text-[11px] md:text-sm uppercase tracking-[0.2em] font-black`}>
                            {t.position}
                            <span className="hidden lg:inline-block ml-1 opacity-40 font-mono text-[9px] md:text-[11px]">(A)</span>
                        </span>
                      </div>
                    </button>
                    {(gameMode === 'dual' || gameMode === 'triple') && (
                      <button 
                        onMouseDown={handleSoundClick} 
                        disabled={currentIndex <= level} 
                        className={`relative rounded-[2rem] font-black transition-all border-2 active:scale-90 shadow-2xl ${buttonFeedback.sound ? 'bg-purple-400 border-white/40' : 'bg-purple-600 border-transparent'} text-white disabled:opacity-30 py-8`}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Volume2 size={36} />
                          <span className={`text-[11px] md:text-sm uppercase tracking-[0.2em] font-black`}>
                            {t.sound}
                            <span className="hidden lg:inline-block ml-1 opacity-40 font-mono text-[9px] md:text-[11px]">(L)</span>
                          </span>
                        </div>
                      </button>
                    )}
                    {gameMode === 'triple' && (
                      <button 
                        onMouseDown={handleColorClick} 
                        disabled={currentIndex <= level} 
                        className={`relative rounded-[2rem] font-black transition-all border-2 active:scale-90 shadow-2xl ${buttonFeedback.color ? 'bg-emerald-400 border-white/40' : 'bg-emerald-600 border-transparent'} text-white disabled:opacity-30 py-8`}
                      >
                        <div className="flex flex-col items-center gap-2">
                          <Palette size={36} />
                          <span className={`text-[11px] md:text-sm uppercase tracking-[0.2em] font-black`}>
                            {t.color}
                            <span className="hidden lg:inline-block ml-1 opacity-40 font-mono text-[9px] md:text-[11px]">(S)</span>
                          </span>
                        </div>
                      </button>
                    )}
                  </div>
                  <div className="bg-slate-950/40 p-4 rounded-[1.5rem] border border-white/5 shadow-inner">
                      <div className="flex justify-between items-center mb-2 px-1">
                        <span className="text-slate-500 text-[10px] md:text-xs font-black uppercase tracking-widest">{t.progress}</span>
                        <span className="text-white text-[10px] md:text-xs font-black bg-indigo-500/20 px-2 py-0.5 rounded-lg border border-indigo-500/20">{currentIndex} / {sequence.length}</span>
                      </div>
                      <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden ring-1 ring-white/5">
                        <div className="bg-indigo-500 h-full transition-all duration-300 shadow-[0_0_10px_rgba(99,102,241,0.4)]" style={{ width: `${(currentIndex / (sequence.length || 1)) * 100}%` }} />
                      </div>
                    </div>
                  <button onClick={() => { triggerHaptic('medium'); finishGame(); }} className="w-full py-4 rounded-[1.5rem] bg-slate-800/40 text-slate-500 font-black text-xs md:text-sm flex items-center justify-center gap-2 border border-white/5 hover:bg-slate-800 hover:text-rose-400 transition-all active:scale-95">
                    <ZapOff size={16} /> {t.endGame}
                  </button>
                </div>
              )}
            </div>
            {/* Zen Mode Buttons fixed at bottom of screen if playing */}
            {isZenMode && isPlaying && (
                 <div className="fixed bottom-0 left-0 right-0 p-8 flex justify-center gap-6 pb-12 z-50">
                    <button 
                      onMouseDown={handlePositionClick} 
                      className={`flex-1 max-w-[140px] aspect-square rounded-[2.5rem] flex flex-col items-center justify-center gap-3 transition-all active:scale-95 border-4 ${buttonFeedback.position ? 'bg-indigo-500 border-white/20' : 'bg-slate-900/50 border-white/10 backdrop-blur-md'}`}
                    >
                        <Square size={32} className="text-white" />
                    </button>
                    {(gameMode === 'dual' || gameMode === 'triple') && (
                       <button 
                        onMouseDown={handleSoundClick} 
                        className={`flex-1 max-w-[140px] aspect-square rounded-[2.5rem] flex flex-col items-center justify-center gap-3 transition-all active:scale-95 border-4 ${buttonFeedback.sound ? 'bg-purple-500 border-white/20' : 'bg-slate-900/50 border-white/10 backdrop-blur-md'}`}
                      >
                          <Volume2 size={32} className="text-white" />
                      </button>
                    )}
                     {gameMode === 'triple' && (
                       <button 
                        onMouseDown={handleColorClick} 
                        className={`flex-1 max-w-[140px] aspect-square rounded-[2.5rem] flex flex-col items-center justify-center gap-3 transition-all active:scale-95 border-4 ${buttonFeedback.color ? 'bg-emerald-500 border-white/20' : 'bg-slate-900/50 border-white/10 backdrop-blur-md'}`}
                      >
                          <Palette size={32} className="text-white" />
                      </button>
                    )}
                 </div>
            )}
            {/* Quit button for Zen mode */}
             {isZenMode && isPlaying && (
                <button onClick={() => { triggerHaptic('medium'); finishGame(); }} className="fixed top-8 right-8 p-4 rounded-full bg-slate-900/20 text-white/20 hover:text-white hover:bg-rose-500/20 transition-all z-50">
                    <ZapOff size={20} />
                </button>
             )}
          </div>
        )}

        {(!isZenMode || !isPlaying) && gameState === 'idle' && (
          <div className="bg-slate-900/20 backdrop-blur-xl rounded-[2.5rem] p-8 border border-white/5 shadow-xl animate-in slide-in-from-bottom-4 duration-700 delay-200 w-full mt-4">
             <h3 className="text-white text-xs md:text-sm font-black uppercase tracking-widest mb-6 flex items-center gap-2 opacity-70"><div className="p-0.5"><Info size={14} className="text-indigo-400" /></div> {t.gameParams}</h3>
             <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
               <div className="space-y-3">
                 <div className="flex items-start gap-3">
                    <div className="shrink-0 p-1 bg-slate-800 rounded-lg"><Brain size={12} className="text-indigo-500" /></div>
                    <div>
                      <p className="text-[10px] md:text-xs font-black text-white uppercase tracking-wider mb-0.5">{t.gameMode}</p>
                      <p className="text-[10px] md:text-xs text-slate-400 leading-snug">{t.gameModeDesc}</p>
                    </div>
                 </div>
                 <div className="flex items-start gap-3">
                    <div className="shrink-0 p-1 bg-slate-800 rounded-lg"><Target size={12} className="text-blue-500" /></div>
                    <div>
                      <p className="text-[10px] md:text-xs font-black text-white uppercase tracking-wider mb-0.5">{t.difficulty}</p>
                      <p className="text-[10px] md:text-xs text-slate-400 leading-snug">{t.difficultyDesc}</p>
                    </div>
                 </div>
                 <div className="flex items-start gap-3">
                    <div className="shrink-0 p-1 bg-slate-800 rounded-lg"><Calendar size={12} className="text-emerald-500" /></div>
                    <div>
                      <p className="text-[10px] md:text-xs font-black text-white uppercase tracking-wider mb-0.5">{t.dailyRace}</p>
                      <p className="text-[10px] md:text-xs text-slate-400 leading-snug">{t.dailyRaceDesc}</p>
                    </div>
                 </div>
                 <div className="flex items-start gap-3">
                    <div className="shrink-0 p-1 bg-slate-800 rounded-lg"><Swords size={12} className="text-orange-500" /></div>
                    <div>
                      <p className="text-[10px] md:text-xs font-black text-white uppercase tracking-wider mb-0.5">{t.challenge}</p>
                      <p className="text-[10px] md:text-xs text-slate-400 leading-snug">{t.challengeDesc}</p>
                    </div>
                 </div>
               </div>
               
               <div className="space-y-3">
                 <div className="flex items-start gap-3">
                    <div className="shrink-0 p-1 bg-slate-800 rounded-lg"><TrendingUp size={12} className="text-emerald-500" /></div>
                    <div>
                      <p className="text-[10px] md:text-xs font-black text-white uppercase tracking-wider mb-0.5">{t.trainingMode}</p>
                      <div className="text-[10px] md:text-xs text-slate-400 leading-snug flex flex-col gap-1 mt-1">
                          <div><span className="text-white font-bold">{t.standard}:</span> {t.standardDesc}</div>
                          <div><span className="text-white font-bold">{t.practice}:</span> {t.practiceDesc}</div>
                      </div>
                    </div>
                 </div>
                 <div className="flex items-start gap-3">
                    <div className="shrink-0 p-1 bg-slate-800 rounded-lg"><ZapOff size={12} className="text-rose-500" /></div>
                    <div>
                      <p className="text-[10px] md:text-xs font-black text-white uppercase tracking-wider mb-0.5">{t.marathon}</p>
                      <p className="text-[10px] md:text-xs text-slate-400 leading-snug">{t.marathonDesc}</p>
                    </div>
                 </div>
                 <div className="flex items-start gap-3">
                    <div className="shrink-0 p-1 bg-slate-800 rounded-lg"><EyeOff size={12} className="text-slate-400" /></div>
                    <div>
                      <p className="text-[10px] md:text-xs font-black text-white uppercase tracking-wider mb-0.5">{t.zenMode}</p>
                      <p className="text-[10px] md:text-xs text-slate-400 leading-snug">{t.zenModeDesc}</p>
                    </div>
                 </div>
               </div>
             </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); opacity: 0.1; }
          50% { transform: scale(1.2); opacity: 0.3; }
        }
        .neural-mesh {
          mask-image: radial-gradient(circle at center, black, transparent 80%);
        }
        button:focus { outline: none; }
      `}</style>
    </div>
  );
};

export default App;
