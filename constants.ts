
export const LETTERS_TR = ['A', 'E', 'İ', 'O', 'U', 'C', 'T', 'S', 'Y'];
export const LETTERS_EN = ['A', 'E', 'I', 'O', 'U', 'C', 'T', 'S', 'Y'];

// Default export for backward compatibility
export const LETTERS = LETTERS_EN;

export const COLORS = [
  '#ef4444', // Red 500
  '#3b82f6', // Blue 500
  '#22c55e', // Green 500
  '#eab308', // Yellow 500
  '#a855f7', // Purple 500
  '#f97316', // Orange 500
  '#06b6d4', // Cyan 500
  '#ec4899', // Pink 500
  '#f8fafc', // Slate 50 (White-ish)
];

export const SPEED_SETTINGS: Record<string, number> = {
  slow: 3500,
  normal: 2500,
  fast: 1500,
};

export const STIMULUS_DURATION = 500;

export const getSequenceLength = (level: number, isPractice: boolean): number => {
  if (isPractice) return 1000;
  if (level === 1) return 21;
  if (level === 2) return 25;
  return 30;
};

export const PHONETIC_MAP_TR: Record<string, string> = {
  'A': 'aa',
  'E': 'eee',
  'İ': 'iii',
  'O': 'oo',
  'U': 'uu',
  'C': 'cee',
  'T': 'tee',
  'S': 'seee',
  'Y': 'yee'
};

export const RANKS = [
  { minXp: 0, name: 'Çömez' },
  { minXp: 500, name: 'Odak Stajyeri' },
  { minXp: 1500, name: 'Zihin Mimarı' },
  { minXp: 4000, name: 'Hafıza Ustası' },
  { minXp: 10000, name: 'Nöro Grandmaster' }
];

export const RANKS_EN = [
  { minXp: 0, name: 'Novice' },
  { minXp: 500, name: 'Focus Intern' },
  { minXp: 1500, name: 'Mind Architect' },
  { minXp: 4000, name: 'Memory Master' },
  { minXp: 10000, name: 'Neuro Grandmaster' }
];

export const XP_MULTIPLIERS = {
  position: 1,
  dual: 1.5,
  triple: 2.2,
  fast: 1.3,
  normal: 1,
  slow: 0.7
};

export const TRANSLATIONS = {
  tr: {
    title: "Canım Anam",
    subtitle: "Hafıza Oyunu",
    streak: "Gün",
    score: "Puan",
    gameMode: "Oyun Modu",
    gameModeDesc: "Hem konumu, hem de harf sesini (ikili) ya da konum, ses ve rengi takip edin (üçlü).",
    difficulty: "Zorluk Derecesi (N)",
    difficultyDesc: "Mevcut uyaranın, N adım önceki uyaranla eşleşip eşleşmediğini bulun.",
    dailyRace: "Günlük Yarış",
    dailyRaceDesc: "Her gün herkes için aynı olan sabit diziyle oynayın.",
    speed: "Oyun Ritmi",
    trainingMode: "Eğitim Modu",
    practice: "Alıştırma",
    practiceDesc: "Süre sınırı yok. Hata yapılabilir.",
    marathon: "Maraton",
    marathonDesc: "Hata yapana kadar devam eder.",
    zenMode: "Zen Modu",
    zenModeDesc: "Sadece akışa odaklanın.",
    soundCheck: "Ses Kontrol",
    startGame: "Oyunu Başlat",
    challenge: "Meydan Oku",
    challengeDesc: "Arkadaşına özel bir kodla meydan oku.",
    position: "Konum",
    dual: "İkili",
    triple: "Üçlü",
    sound: "Ses",
    color: "Renk",
    progress: "İlerleme",
    endGame: "Oyunu Bitir",
    perfectSession: "Mükemmel Seans!",
    sessionComplete: "Seans Tamamlandı",
    correct: "DOĞRU",
    mistakes: "HATA",
    menu: "Menüye Dön",
    shareScore: "Yeni Skor!",
    shareMsg: "Canım Anam oyununda N-{level} seviyesinde %{score} skor yaptım!",
    challengeReady: "Meydan Okuma Hazır",
    shareLink: "Bağlantıyı Paylaş",
    cancel: "Vazgeç ve Dön",
    neuralMetrics: "Nöral Metrikler",
    reactionTime: "Tepki Süresi",
    bestN: "En İyi Zorluk",
    attentionMap: "Dikkat Eksikliği Haritası",
    resetData: "TÜM VERİLERİ SIFIRLA",
    resetConfirm: "Tüm ilerlemeniz, puanlarınız ve geçmişiniz kalıcı olarak silinecektir. Emin misiniz?",
    shareTitle: "Canım Anam - Zihin Egzersizi",
    sharePrompt: "🧠 Hafızanı ve odaklanmanı test et! \"Canım Anam\" oyununda kaçıncı seviyeye çıkabilirsin? Hemen oyna:",
    slow: "Yavaş",
    normal: "Normal",
    fast: "Hızlı",
    incomingChallenge: "Bir Meydan Okuman Var!",
    friendScore: "Arkadaşın bu ayarlarda <b>%{score}</b> skor yaptı.",
    canYouBeat: "Onu geçebilir misin?",
    level: "Seviye",
    mode: "Mod",
    acceptChallenge: "Meydan Okumayı Kabul Et",
    decline: "Reddet ve Normal Oyna",
    howToPlay: "Nasıl Oynanır?",
    intro1: "Bu oyun, çalışma belleğini ve odaklanmayı güçlendirmeyi amaçlayan, \"Dual N-Back\" temelli bir zihin egzersizidir.",
    intro2: "Ekranda sırayla beliren karelerin konumunu ve eş zamanlı olarak okunan harfleri aklınızda tutmanız gerekir.",
    intro3: "Eğer şu anki konum veya harf, belirlenen seviye sayısı kadar (örneğin 1 adım) öncesindekiyle aynıysa, ilgili butona basarak eşleşmeyi yakalamalısınız.",
    gotIt: "Anladım, Başla",
    tutorialWelcome: "Nasıl Oynanır",
    tutorialWelcomeText: "Hoş geldiniz. Bu protokol çalışma belleği kapasitenizi hızla artırır. Kalibrasyona başlayalım.",
    tutorialReady: "Göreve Hazır",
    tutorialReadyText: "Hazırlık tamamlandı. Kontroller: A (Konum), L (Ses), S (Renk). Başarılar.",
    tutorialStep1: "N=1 için karemizin mevcut yerini aklınızda tutun. İlk konum işaretlendi.",
    tutorialStep2: "Yeni bir konum işaretlendi. Şimdi bir önceki kareyle karşılaştırma yapacağız.",
    tutorialStep3Match: "N=1 modunda, mevcut kare az önceki kareyle aynı yerdeyse KONUM butonuna basın!",
    tutorialBtn: "KONUM BUTONU",
    continue: "Devam Et",
    start: "Başlat",
    gameParams: "Oyun Parametreleri",
    standard: "Standart",
    standardDesc: "20-30 adımlık klasik seans.",
    playAgain: "Tekrar Oyna"
  },
  en: {
    title: "Dual N-Backer",
    subtitle: "Memory Game",
    streak: "Day Streak",
    score: "XP",
    gameMode: "Game Mode",
    gameModeDesc: "Track position and sound (Dual) or position, sound, and color (Triple).",
    difficulty: "Difficulty (N-Back)",
    difficultyDesc: "Identify if the current stimulus matches the one N steps earlier.",
    dailyRace: "Daily Race",
    dailyRaceDesc: "Play with a fixed sequence identical for everyone today.",
    speed: "Speed",
    trainingMode: "Training Mode",
    practice: "Practice",
    practiceDesc: "No time limit. Mistakes allowed.",
    marathon: "Marathon",
    marathonDesc: "Continues until a single mistake.",
    zenMode: "Zen Mode",
    zenModeDesc: "Focus purely on the flow.",
    soundCheck: "Sound Check",
    startGame: "Start the Game",
    challenge: "Challenge",
    challengeDesc: "Challenge a friend with a custom seed.",
    position: "Position",
    dual: "Dual",
    triple: "Triple",
    sound: "Audio",
    color: "Color",
    progress: "Progress",
    endGame: "End Game",
    perfectSession: "Perfect Session!",
    sessionComplete: "Session Complete",
    correct: "CORRECT",
    mistakes: "MISTAKES",
    menu: "Back to Menu",
    shareScore: "New Score!",
    shareMsg: "I scored %{score} in Dual N-Backer at N-{level}!",
    challengeReady: "Challenge Ready",
    shareLink: "Share Link",
    cancel: "Cancel & Return",
    neuralMetrics: "Neural Metrics",
    reactionTime: "Reaction Time",
    bestN: "Best N-Back",
    attentionMap: "Attention Heatmap",
    resetData: "RESET ALL DATA",
    resetConfirm: "All progress, scores, and history will be permanently deleted. Are you sure?",
    shareTitle: "Dual N-Backer - Brain Training",
    sharePrompt: "🧠 Test your memory and focus! How high can you go in \"Dual N-Backer\"? Play now:",
    slow: "Slow",
    normal: "Normal",
    fast: "Fast",
    incomingChallenge: "Incoming Challenge!",
    friendScore: "Your friend scored <b>%{score}</b> with these settings.",
    canYouBeat: "Can you beat them?",
    level: "Level",
    mode: "Mode",
    acceptChallenge: "Accept Challenge",
    decline: "Decline & Play Normal",
    howToPlay: "How to Play?",
    intro1: "This game is a brain exercise based on \"Dual N-Back\" designed to improve working memory and focus.",
    intro2: "You must remember the position of the squares and the letters spoken simultaneously.",
    intro3: "If the current position or letter is the same as the one N steps back (e.g., 1 step), press the corresponding button to catch the match.",
    gotIt: "Got it, Start",
    tutorialWelcome: "How to Play",
    tutorialWelcomeText: "Welcome. This protocol rapidly increases working memory capacity. Let's calibrate.",
    tutorialReady: "Ready to Start",
    tutorialReadyText: "Calibration complete. Controls: A (Position), L (Audio), S (Color). Good luck.",
    tutorialStep1: "For N=1, remember the position of the square. First position marked.",
    tutorialStep2: "New position marked. Now we will compare with the previous square.",
    tutorialStep3Match: "In N=1 mode, if the current square is in the same place as the previous one, press POSITION!",
    tutorialBtn: "POSITION BUTTON",
    continue: "Continue",
    start: "Start",
    gameParams: "Game Parameters",
    standard: "Standard",
    standardDesc: "Classic 20-30 step session.",
    playAgain: "Play Again"
  }
};
