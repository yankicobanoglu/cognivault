
import { Stimulus, GameMode } from '../types.ts';
import { COLORS } from '../constants.ts';

const mulberry32 = (a: number) => {
  return () => {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
};

export const findMatches = (seq: Stimulus[], n: number) => {
  const posMatches: number[] = [];
  const sndMatches: number[] = [];
  const colMatches: number[] = [];
  
  for (let i = n; i < seq.length; i++) {
    if (seq[i].position === seq[i - n].position) {
      posMatches.push(i);
    }
    if (seq[i].sound === seq[i - n].sound) {
      sndMatches.push(i);
    }
    if (seq[i].color === seq[i - n].color) {
      colMatches.push(i);
    }
  }
  
  return { posMatches, sndMatches, colMatches };
};

const preventTriplets = (seq: Stimulus[], n: number, mode: GameMode, random: () => number, letters: string[]): Stimulus[] => {
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
            do { newVal = letters[Math.floor(random() * letters.length)]; }
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

export const generateSequence = (level: number, mode: GameMode, length: number, letters: string[], seed?: number): Stimulus[] => {
  const random = seed !== undefined ? mulberry32(seed) : Math.random;
  const minMatches = Math.floor(random() * 4) + 5; 
  
  let seq: Stimulus[] = [];
  let lastPosition = -1;
  
  for (let i = 0; i < length; i++) {
    let newPosition;
    do {
      newPosition = Math.floor(random() * 9);
    } while (newPosition === lastPosition && random() > 0.3);
    
    lastPosition = newPosition;
    seq.push({
      position: newPosition,
      sound: letters[Math.floor(random() * letters.length)],
      color: COLORS[Math.floor(random() * COLORS.length)]
    });
  }

  seq = preventTriplets(seq, level, mode, random, letters);
  
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

          const formsTriplet = (isPrevMatch && isPrevPrevMatch) || 
                               (isPrevMatch && isNextMatch) || 
                               (isNextMatch && isNextNextMatch);

          if (!formsTriplet) {
            available.push(i);
          }
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
  
  seq = preventTriplets(seq, level, mode, random, letters);
  
  return seq;
};
