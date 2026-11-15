export type GamePhase = 'start' | 'playing' | 'quiz' | 'result';

export type NpcAccessory =
  | 'tophat'
  | 'chef'
  | 'sunhat'
  | 'glasses'
  | 'cap'
  | 'beret'
  | 'apron'
  | 'strawhat'
  | 'wizard'
  | 'scarf';

export interface MathQuestion {
  id: number;
  topic: string;
  prompt: string;
  options: [string, string, string, string];
  correctIndex: number;
  explanation: string;
}

export interface NpcProfile {
  id: string;
  name: string;
  role: string;
  greeting: string;
  position: [number, number]; // [x, z]
  facingAngle: number; // radians around Y
  shirtColor: number;
  pantsColor: number;
  hairColor: number;
  skinColor: number;
  accentColor: number;
  accessory: NpcAccessory;
  question: MathQuestion;
}

export interface AnsweredRecord {
  npcId: string;
  npcName: string;
  questionId: number;
  topic: string;
  prompt: string;
  options: [string, string, string, string];
  selectedIndex: number;
  correctIndex: number;
  isCorrect: boolean;
  pointsEarned: number;
  explanation: string;
}

export interface ProximityInfo {
  npcId: string;
  npcName: string;
  npcRole: string;
  solved: boolean;
  distance: number;
}

export interface ScoreEntry {
  이름: string;
  점수: number;
  rawScore: string | number;
  orderIndex: number;
}
