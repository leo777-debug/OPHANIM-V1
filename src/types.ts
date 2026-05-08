export interface IntelligenceEvent {
  id: string;
  type: "vessel" | "aircraft" | "conflict" | "news" | "satellite";
  lat: number;
  lng: number;
  label: string;
  intensity: number; // 0-1
  details: string;
  timestamp: string;
}

export interface AnalysisResult {
  threat_score: number;
  evidence: string[];
  recommendation: string;
  summary: string;
  timestamp: string;
  new_lesson?: {
    title: string;
    lesson: string;
    context: string;
  };
}

export interface CognitionLesson {
  id: string;
  title: string;
  lesson: string;
  context: string;
}

export interface NewsItem {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: { name: string };
}
