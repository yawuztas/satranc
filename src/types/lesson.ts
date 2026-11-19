import type { Color } from './chess';

export type LessonLevel = 'beginner' | 'intermediate' | 'advanced';
export type LessonCandidateColor = 'green' | 'blue' | 'red' | 'yellow';
export const MAX_CANDIDATE_CHOICES = 4;

export interface LessonCandidate {
  san: string;
  from: string;
  to: string;
  promotion?: 'q' | 'r' | 'b' | 'n';
  label: string;
  why: string;
  consequence: string;
  color: LessonCandidateColor;
}

export interface LessonNode {
  id: string;
  level: LessonLevel;
  title: string;
  openingName: string;
  eco?: string;
  startFen: string;
  targetMove?: string;
  goal: string;
  explanation: string;
  successMessage: string;
  offPlanMessage: string;
  candidates: LessonCandidate[];
  /** Canonical branch routing, keyed by the candidate SAN. */
  nextNodeByMove: Record<string, string | undefined>;
}

export type BeginnerLessonNode = LessonNode & { level: 'beginner' };
export type IntermediateLessonNode = LessonNode & { level: 'intermediate' };
export type AdvancedLessonNode = LessonNode & { level: 'advanced' };

export interface LessonSelection {
  level: LessonLevel;
  color: Color;
}
