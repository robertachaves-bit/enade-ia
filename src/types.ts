export type QuestionType = 'multiple_choice' | 'discursive';
export type DifficultyLevel = 1 | 2 | 3 | 4 | 5;

export interface EnadeQuestion {
  id: string; // Added for history
  type: QuestionType;
  difficulty: DifficultyLevel; // Added difficulty
  topic: string;
  context: string;
  question: string;
  options?: {
    letter: string;
    text: string;
  }[];
  correctAnswer?: string;
  evaluationCriteria?: string[];
  explanation: string;
  visualDescription?: string;
  imageAlt?: string;
  visualData?: string; // For Mermaid or other graphic data
  studySuggestions: {
    topic: string;
    description: string;
    resources: string[];
  }[];
  createdAt: number; // Added for sorting
  isFavorite?: boolean; // Added for favorites
}
