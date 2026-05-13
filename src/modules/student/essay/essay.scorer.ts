/**
 * Pure essay scoring + anti-gaming functions.
 * Source: 03_ESSAY_MODULE.md §4, §7
 * NEVER expose any output from this module in external API responses.
 */

import type { EssayStatus, NotStartedReason } from "./essay.types.js";

// §4.2 — Grade-aware fallback when essay is not started or unqualified
const MISSING_ESSAY_NORM_BY_GRADE: Record<number, number> = {
  9:  0.60,
  10: 0.60,
  11: 0.45,
  12: 0.40,
};

// §4.3 — Status → norm mapping
const ESSAY_STATUS_NORM: Record<EssayStatus, number | null> = {
  not_started: null,
  drafted:     0.55,
  revised:     0.70,
  reviewed:    0.85,
  finalized:   1.00,
};

export const MIN_WORD_COUNT = 250;

// §7 — Anti-gaming thresholds
const MIN_UNIQUE_WORD_RATIO    = 0.30;
const MIN_SENTENCES            = 3;
const MIN_UNIQUE_SENTENCE_RATIO = 0.70;

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

export function detectRepetition(text: string): boolean {
  if (!text || text.trim().length === 0) return false;

  const words = text.toLowerCase().match(/\b\w+\b/g) ?? [];
  if (words.length === 0) return false;

  // Check word uniqueness ratio
  const uniqueWords = new Set(words);
  if (uniqueWords.size / words.length < MIN_UNIQUE_WORD_RATIO) return true;

  // Check sentence diversity
  const sentences = text
    .split(/[.!?]+/)
    .map(s => s.trim().toLowerCase())
    .filter(s => s.length > 5);

  if (sentences.length < MIN_SENTENCES) return true;

  const uniqueSentences = new Set(sentences);
  if (uniqueSentences.size / sentences.length < MIN_UNIQUE_SENTENCE_RATIO) return true;

  return false;
}

export interface QualificationResult {
  qualified:          boolean;
  not_started_reason: NotStartedReason | null;
}

export function checkEssayQualification(
  essayText:          string | null,
  wordCount:          number,
  draftSavedAt:       Date | null,
  repetitionDetected: boolean,
): QualificationResult {
  if (!essayText || essayText.trim().length === 0) {
    return { qualified: false, not_started_reason: "EMPTY" };
  }
  if (wordCount < MIN_WORD_COUNT) {
    return { qualified: false, not_started_reason: "TOO_SHORT" };
  }
  if (!draftSavedAt) {
    return { qualified: false, not_started_reason: "NOT_SAVED" };
  }
  if (repetitionDetected) {
    return { qualified: false, not_started_reason: "REPETITIVE" };
  }
  return { qualified: true, not_started_reason: null };
}

export interface EssayScores {
  essay_norm:    number;
  essay_contrib: number;
}

export function calcEssayScores(status: EssayStatus, grade: number): EssayScores {
  const normValue =
    status === "not_started"
      ? (MISSING_ESSAY_NORM_BY_GRADE[grade] ?? 0.45)
      : (ESSAY_STATUS_NORM[status] ?? MISSING_ESSAY_NORM_BY_GRADE[grade] ?? 0.45);

  const essay_norm    = normValue;
  const essay_contrib = 15 * essay_norm;
  return { essay_norm, essay_contrib };
}

export const REFLECTION_LOCK_HOURS = 48;
export const MAJOR_EDIT_WORD_DELTA = 50;

export function isMajorEdit(currentWordCount: number, previousWordCount: number): boolean {
  return Math.abs(currentWordCount - previousWordCount) >= MAJOR_EDIT_WORD_DELTA;
}

export function calcReflectionLockUntil(from: Date): Date {
  return new Date(from.getTime() + REFLECTION_LOCK_HOURS * 60 * 60 * 1000);
}

export function isReflectionLockSatisfied(reflectionLockUntil: Date | null): boolean {
  if (!reflectionLockUntil) return true;
  return new Date() >= reflectionLockUntil;
}
