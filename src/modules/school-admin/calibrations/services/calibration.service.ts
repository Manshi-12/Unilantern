import { CalibrationRepository } from '../repositories/calibration.repository';
import { CalibrationResponse }   from '../types/calibration.types';
import { AuthRepository }        from '../../../auth/school-admin/repositories/auth.repository';
import { SaveCalibrationDto }    from '../validtors/calibration.validation';

const repo     = new CalibrationRepository();
const authRepo = new AuthRepository();

// ─── Platform defaults (returned when no active override exists) ───────────────
const PLATFORM_DEFAULTS = {
  gpa:   { min: 2.0,  max: 4.0  },
  rigor: { min: 0,    max: 100  },
  sat:   { min: 400,  max: 1600 },
  act:   { min: 1,    max: 36   },
};

// ─── 3.1 GET /v1/school-admin/calibration ─────────────────────────────────────

export const getCalibration = async (school_id: number): Promise<CalibrationResponse> => {
  const row = await repo.findActiveOverride(school_id);

  if (!row) {
    return {
      school_id,
      is_overridden:   false,
      calibration:     PLATFORM_DEFAULTS,
      set_by_admin_id: null,
      updated_at:      null,
    };
  }

  const bands = repo.parseBands(row);

  return {
    school_id,
    is_overridden: true,
    calibration: {
      gpa:   { min: bands.gpa.min   ?? PLATFORM_DEFAULTS.gpa.min,   max: bands.gpa.max   ?? PLATFORM_DEFAULTS.gpa.max   },
      rigor: { min: bands.rigor.min ?? PLATFORM_DEFAULTS.rigor.min, max: bands.rigor.max ?? PLATFORM_DEFAULTS.rigor.max },
      sat:   { min: bands.sat.min   ?? PLATFORM_DEFAULTS.sat.min,   max: bands.sat.max   ?? PLATFORM_DEFAULTS.sat.max   },
      act:   { min: bands.act.min   ?? PLATFORM_DEFAULTS.act.min,   max: bands.act.max   ?? PLATFORM_DEFAULTS.act.max   },
    },
    set_by_admin_id: row.set_by_admin_id,
    updated_at:      row.updated_at,
  };
};

// ─── 3.2 PUT /v1/school-admin/calibration ─────────────────────────────────────

export const saveCalibration = async (
  school_id: number,
  admin_id:  number,
  body:      SaveCalibrationDto,
): Promise<CalibrationResponse> => {
  await repo.deactivateAllOverrides(school_id);

  await repo.insertOverride({
    school_id,
    set_by_admin_id: admin_id,
    gpa:   body.gpa,
    rigor: body.rigor,
    sat:   body.sat,
    act:   body.act,
  });

  await authRepo.writeAuditLog({
    actor_admin_id:  admin_id,
    actor_role:      'school_admin',
    school_id,
    action_type:     'CALIBRATION_SAVED',
    target_resource: 'school_academic_calibration',
    metadata:        { gpa: body.gpa, rigor: body.rigor, sat: body.sat, act: body.act },
  });

  return getCalibration(school_id);
};

// ─── 3.3 PUT /v1/school-admin/calibration/restore-defaults ───────────────────
// spec: was DELETE — changed to PUT; rows are never hard-deleted

export const restoreDefaults = async (
  school_id: number,
  admin_id:  number,
): Promise<CalibrationResponse> => {
  await repo.deactivateAllOverrides(school_id);

  await authRepo.writeAuditLog({
    actor_admin_id:  admin_id,
    actor_role:      'school_admin',
    school_id,
    action_type:     'CALIBRATION_RESTORED_DEFAULTS',
    target_resource: 'school_academic_calibration',
    metadata:        {},
  });

  return getCalibration(school_id);
};




