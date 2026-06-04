import { getPool, sql }                from '../../../../database/db';
import { CalibrationRow, BandRange }   from '../types/calibration.types';
import { BandInput, ICalibrationRepository } from '../interfaces/calibrations.interface';

export class CalibrationRepository implements ICalibrationRepository {

  // ─── Helpers ───────────────────────────────────────────────────────────────

  private parseBand(raw: string | null): BandRange {
    if (!raw) return { min: null, max: null };
    try {
      return JSON.parse(raw) as BandRange;
    } catch {
      return { min: null, max: null };
    }
  }

  private toBandJson(band?: BandInput): string | null {
    if (!band) return null;
    if (band.min == null && band.max == null) return null;
    return JSON.stringify({ min: band.min ?? null, max: band.max ?? null });
  }

  // ─── Find active override ──────────────────────────────────────────────────

  async findActiveOverride(school_id: number): Promise<CalibrationRow | null> {
    const pool = await getPool();
    const result = await pool.request()
      .input('school_id', sql.Int, school_id)
      .query(`
        SELECT TOP 1
          calibration_id, school_id,
          gpa_band_override, rigor_override,
          sat_benchmark_override, act_benchmark_override,
          is_active, set_by_admin_id, updated_at
        FROM school_academic_calibration
        WHERE school_id = @school_id
          AND is_active  = 1
        ORDER BY updated_at DESC
      `);

    if (!result.recordset[0]) return null;
    const row = result.recordset[0];
    return {
      ...row,
      is_active: row.is_active === true || row.is_active === 1,
    };
  }

  // ─── Soft-deactivate all active overrides ──────────────────────────────────

  async deactivateAllOverrides(school_id: number): Promise<void> {
    const pool = await getPool();
    await pool.request()
      .input('school_id', sql.Int, school_id)
      .query(`
        UPDATE school_academic_calibration
        SET is_active  = 0,
            updated_at = GETDATE()
        WHERE school_id = @school_id
          AND is_active  = 1
      `);
  }

  // ─── Insert new override row ───────────────────────────────────────────────

  async insertOverride(data: {
    school_id:       number;
    set_by_admin_id: number;
    gpa?:            BandInput;
    rigor?:          BandInput;
    sat?:            BandInput;
    act?:            BandInput;
  }): Promise<{ calibration_id: number }> {
    const pool = await getPool();

    const result = await pool.request()
      .input('school_id',              sql.Int,               data.school_id)
      .input('set_by_admin_id',        sql.Int,               data.set_by_admin_id)
      .input('gpa_band_override',      sql.NVarChar(sql.MAX), this.toBandJson(data.gpa))
      .input('rigor_override',         sql.NVarChar(sql.MAX), this.toBandJson(data.rigor))
      .input('sat_benchmark_override', sql.NVarChar(sql.MAX), this.toBandJson(data.sat))
      .input('act_benchmark_override', sql.NVarChar(sql.MAX), this.toBandJson(data.act))
      .query(`
        INSERT INTO school_academic_calibration
          (school_id, gpa_band_override, rigor_override,
           sat_benchmark_override, act_benchmark_override,
           is_active, set_by_admin_id, updated_at)
        OUTPUT INSERTED.calibration_id
        VALUES
          (@school_id, @gpa_band_override, @rigor_override,
           @sat_benchmark_override, @act_benchmark_override,
           1, @set_by_admin_id, GETDATE())
      `);

    return { calibration_id: result.recordset[0].calibration_id };
  }

  // ─── Parse bands ──────────────────────────────────────────────────────────

  parseBands(row: CalibrationRow): {
    gpa:   BandRange;
    rigor: BandRange;
    sat:   BandRange;
    act:   BandRange;
  } {
    return {
      gpa:   this.parseBand(row.gpa_band_override),
      rigor: this.parseBand(row.rigor_override),
      sat:   this.parseBand(row.sat_benchmark_override),
      act:   this.parseBand(row.act_benchmark_override),
    };
  }
}




