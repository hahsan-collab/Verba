export interface Derivative {
  term: string;
  meaning: string;
  example: string;
}

export interface DailyItem {
  term: string;
  meaning: string;
  examples: string[];
  phonetic?: string;
  history?: string;
  nuance?: string;
  relatedTerms?: string[];
  antonyms?: string[];
  derivatives?: Derivative[];
}

export interface DailyContent {
  genre: string;
  word: DailyItem;
  connector: DailyItem;
  phrase: DailyItem;
  idiom: DailyItem;
}

export interface SavedNote {
  id: string;
  term: string;
  meaning: string;
  examples: string[];
  nuance?: string;
  phonetic?: string;
  relatedTerms?: string[];
  antonyms?: string[];
  derivatives?: Derivative[];
  expansions?: SavedNote[]; // Store the full items saved from this word
  relation?: 'synonym' | 'antonym'; 
  type: 'word' | 'connector' | 'phrase' | 'idiom';
  dateSaved: string;
  masteryLevel?: number; // 0 to 100
  lastReviewed?: string; // ISO Date
  nextReview?: string; // ISO Date
}

export interface UserProgress {
  totalLearned: number;
  lastTestDate: string | null;
  learnedToday: string[]; // ids or terms
}
