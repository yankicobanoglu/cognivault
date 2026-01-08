import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Analytics } from '@vercel/analytics/react';
import {
  Volume2,
  Square,
  Play,
  RotateCcw,
  Zap,
  Info,
  TrendingUp,
  Trophy,
  Brain,
  Palette,
  Gauge,
  Target,
  HelpCircle,
  XCircle,
  ChevronRight,
  CheckCircle2,
  ArrowLeft,
  BarChart3,
  Settings,
  EyeOff,
  Calendar,
  Globe,
  Flame,
  Star,
  ZapOff,
  Trash2,
  Swords,
  Share2,
} from 'lucide-react';

// --- CONSTANTS & DATA ---
const LETTERS_TR = ['A', 'E', 'İ', 'O', 'U', 'C', 'T', 'S', 'Y'];
const LETTERS_EN = ['A', 'E', 'I', 'O', 'U', 'C', 'T', 'S', 'Y'];
const LETTERS = LETTERS_EN;

const COLORS = [
  '#ef4444', '#3b82f6', '#22c55e', '#eab308',
  '#06b6d4', '#d946ef', '#f97316', '#ec4899',
  '#6366f1', '#14b8a6', '#84cc16', '#f43f5e'
];

const SPEED_SETTINGS = {
  slow: { duration: 2000, interval: 3500 },
  normal: { duration: 1200, interval: 2500 },
  fast: { duration: 600, interval: 1500 },
};

const STIMULUS_DURATION = {
  short: 500,
  medium: 1000,
  long: 2000,
};

function App() {
  // State management
  const [gameState, setGameState] = useState<'menu' | 'playing' | 'paused' | 'gameover'>('menu');
  const [level, setLevel] = useState(1);
  const [isPractice, setIsPractice] = useState(false);
  const [score, setScore] = useState(0);
  const [playerResponse, setPlayerResponse] = useState<string>('');
  const [currentSequence, setCurrentSequence] = useState<string[]>([]);
  const [displaySequence, setDisplaySequence] = useState<string[]>([]);
  const [userSequence, setUserSequence] = useState<string[]>([]);
  const [language, setLanguage] = useState<'EN' | 'TR'>('EN');
  const [xp, setXp] = useState(0);
  const [rank, setRank] = useState(0);

  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    // Initialize audio context
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
  }, []);

  const startGame = useCallback(() => {
    setGameState('playing');
    setScore(0);
    setXp(0);
    setLevel(1);
    setUserSequence([]);
    setDisplaySequence([]);
  }, []);

  const endGame = useCallback(() => {
    setGameState('gameover');
  }, []);

  const resetGame = useCallback(() => {
    setGameState('menu');
    setScore(0);
    setLevel(1);
    setUserSequence([]);
    setDisplaySequence([]);
    setCurrentSequence([]);
    setPlayerResponse('');
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-black text-white">
      {/* Header */}
      <header className="border-b border-slate-700 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Brain className="w-8 h-8 text-indigo-500" />
            <h1 className="text-2xl font-bold">CogniVault</h1>
          </div>
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-500" />
              <span>{xp} XP</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              <span>Rank {rank}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        {gameState === 'menu' && (
          <div className="flex flex-col items-center justify-center min-h-[70vh] gap-8">
            <div className="text-center">
              <h2 className="text-4xl font-bold mb-4">Welcome to CogniVault</h2>
              <p className="text-gray-400 mb-8">Test and enhance your memory and perception</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl">
              <button
                onClick={() => {
                  setIsPractice(false);
                  startGame();
                }}
                className="p-6 rounded-lg bg-gradient-to-br from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 transition-all flex items-center gap-3"
              >
                <Zap className="w-6 h-6" />
                <div className="text-left">
                  <h3 className="font-bold">Challenge Mode</h3>
                  <p className="text-sm text-indigo-200">Test your limits</p>
                </div>
              </button>

              <button
                onClick={() => {
                  setIsPractice(true);
                  startGame();
                }}
                className="p-6 rounded-lg bg-gradient-to-br from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 transition-all flex items-center gap-3"
              >
                <Target className="w-6 h-6" />
                <div className="text-left">
                  <h3 className="font-bold">Practice Mode</h3>
                  <p className="text-sm text-green-200">Learn at your own pace</p>
                </div>
              </button>
            </div>

            <div className="mt-8 p-6 rounded-lg bg-slate-800/50 border border-slate-700 max-w-2xl">
              <h3 className="font-bold mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-blue-400" />
                How to Play
              </h3>
              <ul className="space-y-2 text-sm text-gray-300">
                <li>• Watch the sequence of colors and sounds</li>
                <li>• Remember the order and pattern</li>
                <li>• Reproduce the sequence correctly</li>
                <li>• Complete rounds to advance to the next level</li>
              </ul>
            </div>
          </div>
        )}

        {gameState === 'playing' && (
          <div className="flex flex-col items-center justify-center min-h-[70vh] gap-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-2">Level {level}</h2>
              <p className="text-gray-400">Score: {score}</p>
            </div>

            <div className="grid grid-cols-3 gap-4 w-full max-w-md">
              {COLORS.slice(0, 9).map((color, index) => (
                <button
                  key={index}
                  className="aspect-square rounded-lg transition-all"
                  style={{
                    backgroundColor: color,
                    opacity: 0.7,
                    boxShadow: `0 0 20px ${color}40`,
                  }}
                />
              ))}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setGameState('paused')}
                className="px-6 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 transition-all flex items-center gap-2"
              >
                <Square className="w-4 h-4" />
                Pause
              </button>
              <button
                onClick={endGame}
                className="px-6 py-2 rounded-lg bg-red-600 hover:bg-red-500 transition-all flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                End Game
              </button>
            </div>
          </div>
        )}

        {gameState === 'paused' && (
          <div className="flex flex-col items-center justify-center min-h-[70vh] gap-8">
            <h2 className="text-3xl font-bold">Game Paused</h2>
            <div className="flex gap-4">
              <button
                onClick={() => setGameState('playing')}
                className="px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-all flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Resume
              </button>
              <button
                onClick={resetGame}
                className="px-6 py-3 rounded-lg bg-slate-700 hover:bg-slate-600 transition-all flex items-center gap-2"
              >
                <RotateCcw className="w-4 h-4" />
                Back to Menu
              </button>
            </div>
          </div>
        )}

        {gameState === 'gameover' && (
          <div className="flex flex-col items-center justify-center min-h-[70vh] gap-8">
            <div className="text-center">
              <h2 className="text-3xl font-bold mb-4">Game Over!</h2>
              <p className="text-gray-400 mb-2">Final Score: {score}</p>
              <p className="text-gray-400">Level Reached: {level}</p>
            </div>

            <div className="flex gap-4">
              <button
                onClick={startGame}
                className="px-6 py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 transition-all flex items-center gap-2"
              >
                <Play className="w-4 h-4" />
                Play Again
              </button>
              <button
                onClick={resetGame}
                className="px-6 py-3 rounded-lg bg-slate-700 hover:bg-slate-600 transition-all flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Main Menu
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Vercel Web Analytics */}
      <Analytics />
    </div>
  );
}

export default App;
