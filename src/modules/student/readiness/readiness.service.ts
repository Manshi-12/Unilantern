import { AuthError } from "../../../shared/errors/auth-error.js";
import { AuthErrorCode } from "../../../shared/response/error-codes.js";
import type { ReadinessRepository } from "./readiness.repository.js";
import type {
  ReadinessPublicResponseDto,
  ReadinessHistoryResponseDto,
  ReadinessHistoryItemDto,
  ImprovementRecommendationsResponseDto,
  RecalculateResponseDto,
  ReadinessBandEnum,
  CategoryStatusEnum,
  CategoryStatusesDto,
} from "./dto/response.dto.js";

export class ReadinessService {
  constructor(private readonly readinessRepo: ReadinessRepository) {}

  // ── 8.1: Get Current Readiness Output ──────────────────────────────────────
  async getCurrentReadiness(studentId: number): Promise<ReadinessPublicResponseDto> {
    const profile = await this.readinessRepo.getStudentProfile(studentId);
    if (!profile) {
      throw new AuthError(AuthErrorCode.INTERNAL_ERROR, "Student profile not found", 500);
    }

    const scoreRow = await this.readinessRepo.getStudentScores(studentId);
    const profileCompleteEnough = !!profile.grade && !!scoreRow && !!scoreRow.readiness_band;

    if (!profileCompleteEnough) {
      const nowStr = new Date().toISOString();
      const grade = profile.grade;
      return {
        readiness_band: "foundational",
        band_description: "To see your Lantern Readiness Index, please complete your profile by adding your academics, extracurriculars, and other key details.",
        on_track_status: null,
        grade_aware_message: "Complete your profile to see if you are on track.",
        category_statuses: {
          academics: "needs_attention",
          extracurriculars: "needs_attention",
          essay: grade && grade <= 10 ? null : "needs_attention",
          awards: "needs_attention",
          service: "needs_attention",
        },
        primary_limiter: "profile_completeness",
        primary_limiter_description: "Please complete your profile to unlock full readiness analytics.",
        trend_direction: null,
        last_calculated_at: scoreRow?.calculated_at ? scoreRow.calculated_at.toISOString() : nowStr,
        profile_complete_enough: false,
      };
    }

    // Since profileCompleteEnough is true, we know scoreRow and scoreRow.readiness_band are non-null
    const band = scoreRow!.readiness_band!.toLowerCase() as ReadinessBandEnum;
    const grade = profile.grade;

    // Get trend direction from history if available
    const latestHistory = await this.readinessRepo.getLatestScoreHistory(studentId);
    const trend = (latestHistory?.trend_direction ?? "stable") as "improving" | "declining" | "stable";

    return {
      readiness_band: band,
      band_description: this.getBandDescription(band),
      on_track_status: scoreRow!.on_track_status as "on_track" | "ahead" | null,
      grade_aware_message: this.getGradeAwareMessage(grade, band),
      category_statuses: {
        academics: this.mapBandToCategoryStatus(scoreRow!.academics_band),
        extracurriculars: this.mapBandToCategoryStatus(scoreRow!.ec_band),
        essay: grade && grade <= 10 ? null : this.mapBandToCategoryStatus(scoreRow!.essay_band),
        awards: this.mapBandToCategoryStatus(scoreRow!.awards_band),
        service: this.mapBandToCategoryStatus(scoreRow!.service_band),
      },
      primary_limiter: scoreRow!.primary_limiter,
      primary_limiter_description: this.getLimiterDescription(scoreRow!.primary_limiter),
      trend_direction: trend,
      last_calculated_at: scoreRow!.calculated_at.toISOString(),
      profile_complete_enough: true,
    };
  }

  // ── 8.2: Get Readiness Band History ────────────────────────────────────────
  async getReadinessHistory(
    studentId: number,
    limit: number,
    cursor?: string
  ): Promise<ReadinessHistoryResponseDto> {
    const profile = await this.readinessRepo.getStudentProfile(studentId);
    if (!profile) {
      throw new AuthError(AuthErrorCode.INTERNAL_ERROR, "Student profile not found", 500);
    }

    let cursorId: number | null = null;
    if (cursor) {
      try {
        const decoded = Buffer.from(cursor, "base64").toString("utf-8");
        cursorId = Number(decoded);
        if (Number.isNaN(cursorId)) {
          cursorId = null;
        }
      } catch (err) {
        cursorId = null;
      }
    }

    const { records, hasMore } = await this.readinessRepo.getScoreHistory(studentId, limit, cursorId);

    const data: ReadinessHistoryItemDto[] = records.map((rec) => {
      const snapGrade = rec.grade_at_snapshot;
      return {
        snapshot_term: rec.snapshot_term,
        grade_at_snapshot: snapGrade,
        readiness_band: (rec.readiness_band?.toLowerCase() ?? "foundational") as ReadinessBandEnum,
        academics_band: (rec.academics_band?.toLowerCase() ?? "foundational") as ReadinessBandEnum,
        ec_band: (rec.ec_band?.toLowerCase() ?? "foundational") as ReadinessBandEnum,
        essay_band: snapGrade <= 10 ? null : ((rec.essay_band?.toLowerCase() ?? "foundational") as ReadinessBandEnum),
        awards_band: (rec.awards_band?.toLowerCase() ?? "foundational") as ReadinessBandEnum,
        service_band: (rec.service_band?.toLowerCase() ?? "foundational") as ReadinessBandEnum,
        trend_direction: (rec.trend_direction?.toLowerCase() ?? "stable") as "improving" | "declining" | "stable",
        primary_limiter: rec.primary_limiter,
        snapshot_at: rec.snapshot_at.toISOString(),
      };
    });

    let nextCursor: string | null = null;
    if (hasMore && records.length > 0) {
      const lastRec = records[records.length - 1];
      nextCursor = Buffer.from(String(lastRec.history_id)).toString("base64");
    }

    return {
      data,
      next_cursor: nextCursor,
      has_more: hasMore,
    };
  }

  // ── 8.3: Get Improvement Recommendations ──────────────────────────────────
  async getImprovementRecommendations(
    studentId: number
  ): Promise<ImprovementRecommendationsResponseDto> {
    const profile = await this.readinessRepo.getStudentProfile(studentId);
    if (!profile) {
      throw new AuthError(AuthErrorCode.INTERNAL_ERROR, "Student profile not found", 500);
    }

    const scoreRow = await this.readinessRepo.getStudentScores(studentId);
    const profileCompleteEnough = !!profile.grade && !!scoreRow && !!scoreRow.readiness_band;

    if (!profileCompleteEnough) {
      return {
        primary_focus: "Profile Completeness",
        primary_action: "Complete your student profile",
        secondary_actions: [
          "Enter your academic information (GPA and course rigor)",
          "List your extracurricular activities with details",
          "Provide honors and awards you have received",
          "Add your community service hours",
        ],
        band_transition_guidance: "To generate personalized college readiness recommendations, the Lantern Readiness Engine needs more profile information.",
        next_band: "developing",
        grade_specific_tips: [
          "Complete your profile today to get customized, grade-specific tips for your college application journey.",
        ],
      };
    }

    const band = scoreRow!.readiness_band!.toLowerCase() as ReadinessBandEnum;
    const limiter = scoreRow!.primary_limiter;
    const grade = profile.grade;

    return this.calculateRecommendations(band, limiter, grade);
  }

  // ── 8.4: Trigger Readiness Recalculation ───────────────────────────────────
  async recalculateReadiness(studentId: number): Promise<RecalculateResponseDto> {
    console.log(`[readiness] manual readiness recalculation queued for student_id=${studentId}`);
    return {
      recalculation_queued: true,
      queued_at: new Date().toISOString(),
    };
  }

  // ── Helpers ────────────────────────────────────────────────────────────────
  private getBandDescription(band: ReadinessBandEnum): string {
    switch (band) {
      case "exceptional":
        return "Your profile demonstrates outstanding strength across all major readiness areas, putting you in a very strong position for the most selective institutions.";
      case "strongly_competitive":
        return "Your profile shows significant depth and academic strength, making you a highly competitive applicant for selective colleges.";
      case "competitive":
        return "You have built a solid foundation with good academic alignment and active extracurricular involvement, making you competitive for selective colleges.";
      case "developing":
        return "You are establishing key credentials and exploring opportunities to strengthen your profile across academics and activities.";
      case "foundational":
      default:
        return "You are starting to build your college readiness path. Focus on establishing strong academic habits and exploring your interests.";
    }
  }

  private getGradeAwareMessage(grade: number | null, band: ReadinessBandEnum): string {
    if (!grade) return "Add your grade to see tailored readiness insights.";
    const bandLabel = band.charAt(0).toUpperCase() + band.slice(1);
    if (grade === 9) {
      if (band === "developing") return "For a Grade 9 student, Developing is On Track.";
      if (band === "competitive" || band === "strongly_competitive" || band === "exceptional") {
        return "For a Grade 9 student, this profile is Ahead of Schedule.";
      }
      return "For a Grade 9 student, this is a Foundational start. Keep building!";
    }
    if (grade === 10) {
      if (band === "competitive") return "For a Grade 10 student, Competitive is On Track.";
      if (band === "strongly_competitive" || band === "exceptional") {
        return "For a Grade 10 student, this profile is Ahead of Schedule.";
      }
      return "For a Grade 10 student, this is a Developing start. Keep building your profile.";
    }
    if (grade === 11) {
      if (band === "strongly_competitive" || band === "exceptional") {
        return "For a Grade 11 student, this profile is Ahead of Schedule.";
      }
      if (band === "competitive") return "For a Grade 11 student, Competitive is On Track.";
      return "For a Grade 11 student, focus on strengthening key areas to get On Track.";
    }
    if (grade === 12) {
      if (band === "strongly_competitive" || band === "exceptional") {
        return "For a Grade 12 student, this profile is On Track for Selective Colleges.";
      }
      if (band === "competitive") return "For a Grade 12 student, Competitive is a strong foundation for college applications.";
      return "For a Grade 12 student, focus on final refinements to maximize your college options.";
    }
    return `For a Grade ${grade} student, your profile is currently ${bandLabel}.`;
  }

  private mapBandToCategoryStatus(band: string | null): CategoryStatusEnum {
    if (!band) return "needs_attention";
    switch (band.toLowerCase()) {
      case "foundational":
        return "needs_attention";
      case "developing":
        return "developing";
      case "competitive":
        return "on_track";
      case "strongly_competitive":
      case "exceptional":
        return "strong";
      default:
        return "needs_attention";
    }
  }

  private getLimiterDescription(limiter: string | null): string | null {
    if (!limiter) return null;
    const key = limiter.toLowerCase();
    if (key.includes("academic") || key.includes("gpa") || key.includes("test")) {
      return "Your academic sub-score is currently the main area limiting your overall readiness. Focus on raising your GPA or test scores to align with selective college expectations.";
    }
    if (key.includes("extracurricular") || key.includes("ec")) {
      return "Your extracurricular depth and commitment level is the main area limiting your overall readiness. Strengthening your responsibility or showing leadership in one key activity will have the greatest impact.";
    }
    if (key.includes("essay")) {
      return "Your essay completion status or review feedback is currently the primary focus area. Moving your essay from draft to reviewed and finalized status will boost your readiness index.";
    }
    if (key.includes("award") || key.includes("honor")) {
      return "Your honors and awards level is the main limiting factor. Seeking out school, district, or regional recognition for your achievements will help boost your profile.";
    }
    if (key.includes("service") || key.includes("community")) {
      return "Your community service hours or leadership in service is the primary limiting factor. Committing to a consistent service project or taking on an organizing role will improve your readiness.";
    }
    return "Strengthening this category would most improve your overall college readiness.";
  }

  private calculateRecommendations(
    band: ReadinessBandEnum,
    limiter: string | null,
    grade: number | null
  ): ImprovementRecommendationsResponseDto {
    const nextBands: Record<ReadinessBandEnum, ReadinessBandEnum | null> = {
      foundational: "developing",
      developing: "competitive",
      competitive: "strongly_competitive",
      strongly_competitive: "exceptional",
      exceptional: null,
    };

    const nextBand = nextBands[band] ?? null;

    let primaryFocus = "Academics";
    let primaryAction = "Maintain a strong GPA and course rigor.";
    let secondaryActions = [
      "Challenge yourself with advanced courses (AP/IB/Honors) if available.",
      "Begin preparing for standardized tests (SAT/ACT) if planning to submit them.",
    ];
    let bandTransitionGuidance = "To move to the next band, focus on consistency in your course grades and select advanced courses that demonstrate academic rigor.";
    let gradeSpecificTips = [
      "Meet with your school counselor to map out your multi-year course plan.",
      "Establish solid study habits and aim for high grades in core subjects.",
    ];

    const limiterKey = (limiter || "academics").toLowerCase();

    if (limiterKey.includes("academic") || limiterKey.includes("gpa")) {
      primaryFocus = "Academics";
      primaryAction = "Improve your unweighted GPA and course rigor.";
      secondaryActions = [
        "Select Honors, AP, or IB courses in subjects where you excel.",
        "Seek academic tutoring or study groups to boost challenging subject grades.",
        "If applicable, prepare for the SAT/ACT to supplement your GPA.",
      ];
      bandTransitionGuidance = "Improving your GPA and adding rigorous courses is the most direct way to elevate your academic profile.";
    } else if (limiterKey.includes("extracurricular") || limiterKey.includes("ec")) {
      primaryFocus = "Extracurriculars";
      primaryAction = "Deepen engagement and take on leadership in a core activity.";
      secondaryActions = [
        "Identify 1-2 key activities where you can make a meaningful, lasting impact.",
        "Seek out a leadership position, captaincy, or organizing role in your clubs.",
        "Document your specific contributions, hours, and achievements in each activity.",
      ];
      bandTransitionGuidance = "Colleges look for depth and dedication over a long list of casual memberships. Focus on commitment and leadership.";
    } else if (limiterKey.includes("essay")) {
      primaryFocus = "Essay";
      primaryAction = "Begin drafting and refining your personal statement.";
      secondaryActions = [
        "Draft a compelling personal narrative that reveals your character and values.",
        "Share your drafts with trusted advisors or teachers for critical feedback.",
        "Incorporate reflection and proofread thoroughly to eliminate errors.",
      ];
      bandTransitionGuidance = "A strong essay provides a window into your personality. A polished, reflective essay helps set you apart.";
    } else if (limiterKey.includes("award") || limiterKey.includes("honor")) {
      primaryFocus = "Honors & Awards";
      primaryAction = "Pursue recognition in academic or extracurricular fields.";
      secondaryActions = [
        "Submit your work to local, regional, or national competitions.",
        "Apply for school-level academic honors or subject-specific awards.",
        "Engage in academic contests (e.g., Olympiads, writing competitions).",
      ];
      bandTransitionGuidance = "Even local or school-wide honors validate your high achievement and supplement your academic standing.";
    } else if (limiterKey.includes("service") || limiterKey.includes("community")) {
      primaryFocus = "Community Service";
      primaryAction = "Increase service hours or lead a community project.";
      secondaryActions = [
        "Find a local organization or cause that matches your genuine interests.",
        "Commit to regular service hours to show long-term community dedication.",
        "Design and lead a service project to address a specific local need.",
      ];
      bandTransitionGuidance = "Consistent service shows empathy and civic responsibility. Leadership in service is highly valued.";
    }

    if (grade === 9) {
      gradeSpecificTips = [
        "Build a strong academic foundation: Grade 9 GPA forms the basis of your cumulative GPA.",
        "Explore different clubs and activities to find where your true interests lie.",
        "Discuss your college aspirations and potential course tracks with your counselor.",
      ];
    } else if (grade === 10) {
      gradeSpecificTips = [
        "Begin stepping up your involvement in your chosen extracurriculars.",
        "Consider taking your first advanced placement or honors courses.",
        "Explore virtual college tours to start identifying what type of schools interest you.",
      ];
    } else if (grade === 11) {
      gradeSpecificTips = [
        "This is a critical academic year: maximize your GPA and course rigor.",
        "Secure leadership positions in your key extracurricular activities.",
        "Prepare for standard test dates (SAT/ACT) and begin drafting your personal statement.",
      ];
    } else if (grade === 12) {
      gradeSpecificTips = [
        "Finalize your college list and keep track of application deadlines.",
        "Polish and finalize your personal statements and supplemental essays.",
        "Request letters of recommendation from teachers who know your academic strengths well.",
      ];
    }

    return {
      primary_focus: primaryFocus,
      primary_action: primaryAction,
      secondary_actions: secondaryActions,
      band_transition_guidance: bandTransitionGuidance,
      next_band: nextBand,
      grade_specific_tips: gradeSpecificTips,
    };
  }
}
