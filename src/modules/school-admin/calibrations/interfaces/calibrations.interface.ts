import { BandRange } from '../types/calibration.types';

// ── Shared input band shape ────────────────────────────────────────────────────

export interface BandInput {
  min?: number | null;
  max?: number | null;
}

// ── 3.1 GET /v1/school-admin/calibration ──────────────────────────────────────

export interface GetCalibrationResult {
  school_id:       number;
  is_overridden:   boolean;
  calibration: {
    gpa:   BandRange;
    rigor: BandRange;
    sat:   BandRange;
    act:   BandRange;
  };
  set_by_admin_id: number | null;
  updated_at:      string | null;
}

// ── 3.2 PUT /v1/school-admin/calibration ──────────────────────────────────────

export interface SaveCalibrationInput {
  school_id: number;
  admin_id:  number;
  gpa?:      BandInput;
  rigor?:    BandInput;
  sat?:      BandInput;
  act?:      BandInput;
}

export type SaveCalibrationResult = GetCalibrationResult;

// ── 3.3 PUT /v1/school-admin/calibration/restore-defaults ─────────────────────

export interface RestoreDefaultsInput {
  school_id: number;
  admin_id:  number;
}

export type RestoreDefaultsResult = GetCalibrationResult;

// ── Repository contract ────────────────────────────────────────────────────────

export interface ICalibrationRepository {
  findActiveOverride(school_id: number): Promise<import('../types/calibration.types').CalibrationRow | null>;
  deactivateAllOverrides(school_id: number): Promise<void>;
  insertOverride(data: {
    school_id:       number;
    set_by_admin_id: number;
    gpa?:            BandInput;
    rigor?:          BandInput;
    sat?:            BandInput;
    act?:            BandInput;
  }): Promise<{ calibration_id: number }>;
  parseBands(row: import('../types/calibration.types').CalibrationRow): {
    gpa:   BandRange;
    rigor: BandRange;
    sat:   BandRange;
    act:   BandRange;
  };
}




