/**
 * Pure awards scoring functions.
 * Source: 02_AWARDS_SERVICE_MODULE.md §3.1–3.5
 * NEVER expose any output from this module in external API responses.
 */

import type { AwardLevel, AwardFrequency } from "./dto/request.dto.js";

const AWARD_BASE_BY_LEVEL: Record<AwardLevel, number> = {
  school:   1.0,
  district: 2.0,
  state:    4.0,
  national: 7.0,
};

const FREQUENCY_MULTIPLIER: Record<AwardFrequency, number> = {
  one_time:       1.00,
  multiple_years: 1.15,
  annual_since:   1.25,
};

const AWARD_WEIGHTS = [1.00, 0.70, 0.50, 0.35, 0.25, 0.20];
const AWARDS_RAW_MAX = 10.0;

export interface AwardInput {
  award_level: AwardLevel;
  frequency:   AwardFrequency;
}

function calcAwardPoints(award: AwardInput): number {
  return AWARD_BASE_BY_LEVEL[award.award_level] * FREQUENCY_MULTIPLIER[award.frequency];
}

function calcAwardsRaw(awards: AwardInput[]): number {
  const points = awards.map(calcAwardPoints);
  points.sort((a, b) => b - a);

  const K = Math.min(points.length, 6);
  let awards_raw = 0;
  for (let i = 0; i < K; i++) {
    awards_raw += points[i] * AWARD_WEIGHTS[i];
  }
  return awards_raw;
}

export interface AwardsScores {
  awards_raw:     number;
  awards_norm:    number;
  awards_contrib: number;
}

export function calcAwardsScores(awards: AwardInput[]): AwardsScores {
  if (awards.length === 0) {
    return { awards_raw: 0, awards_norm: 0, awards_contrib: 0 };
  }

  const awards_raw    = calcAwardsRaw(awards);
  const awards_norm   = Math.min(awards_raw / AWARDS_RAW_MAX, 1.0);
  const awards_contrib = 5 * awards_norm;

  return { awards_raw, awards_norm, awards_contrib };
}
