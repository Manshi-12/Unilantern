# UniLantern — Folder Structure Reference (with DTOs)
## Student Module · Backend (Node.js/Express/Drizzle) + Frontend (Next.js)
> Derived from: Phase 1 Proposal · Production Database Schema (22 Tables) · REST API v2.0 (64 Endpoints)
> Stack: Node.js 22 LTS · TypeScript 5.x · Express · Drizzle ORM · MSSQL (Azure) · BullMQ · Redis · Zod · jose JWT
> Frontend: Next.js 14 (App Router) · TypeScript · Tailwind CSS
> **DTO Pattern**: Every module has a `dto/` folder with `request.dto.ts` + `response.dto.ts`.
>   - `request.dto.ts`  — typed interfaces/classes for incoming payloads (synced with Zod schema)
>   - `response.dto.ts` — typed interfaces for every API response shape (guarantees no leaking of internal fields)
>   - DTOs are the single source of truth for what flows in and out; services must map to them explicitly.

---

## PART 1 — BACKEND

```
unilantern-api/
│
├── src/
│   │
│   ├── config/                          # All runtime config — never hardcode values
│   │   ├── env.ts                       # Zod-validated env schema (DATABASE_URL, JWT_SECRET, TWILIO_*,
│   │   │                                #   REDIS_URL, AZURE_STORAGE_*, etc.)
│   │   ├── database.ts                  # Drizzle client + Azure SQL connection pool config
│   │   ├── redis.ts                     # ioredis singleton for BullMQ queues + short-TTL caching
│   │   └── constants.ts                 # App-wide constants: OTP_TTL_SECONDS=300,
│   │                                    #   REFLECTION_LOCK_HOURS=48, ESSAY_MIN_WORDS=250,
│   │                                    #   MAJOR_EDIT_WORD_DELTA=50,
│   │                                    #   EC_DIMINISHING_WEIGHTS=[1.00,0.85,0.70...],
│   │                                    #   AWARDS_RAW_MAX=10, JWT_ACCESS_TTL='15m',
│   │                                    #   JWT_REFRESH_TTL='7d',
│   │                                    #   RATE_LIMITS (OTP=5/hr, SIGNUP=3/hr, etc.)
│   │
│   ├── db/                              # Database layer — schema definitions, migrations, seeds
│   │   ├── schema/                      # One Drizzle table definition file per DB table (22 tables)
│   │   │   │
│   │   │   │   ── AUTH & CORE (Tables 1–4) ──
│   │   │   ├── schools.ts               # Table 1: school_id, name, state, district, address,
│   │   │   │                            #   school_type, email_domain, school_status
│   │   │   │                            #   (active|trial|inactive), is_active, created_at, updated_at
│   │   │   ├── users.ts                 # Table 2: user_id, school_id(FK nullable), role,
│   │   │   │                            #   phone_number(UNIQUE), phone_verified, email(nullable),
│   │   │   │                            #   full_name, account_status (independent|school_linked),
│   │   │   │                            #   is_active, invite_token_used, last_login_at,
│   │   │   │                            #   created_at, updated_at
│   │   │   │                            #   NOTE: NO password_hash column — OTP-only auth
│   │   │   ├── otp-verifications.ts     # Table 3: otp_id, phone_number(INDEX), otp_code(hashed),
│   │   │   │                            #   purpose (login|signup|phone_change), is_used, attempts,
│   │   │   │                            #   expires_at(INDEX), created_at
│   │   │   ├── invite-tokens.ts         # Table 4: token_id, school_id(FK), token(UNIQUE),
│   │   │   │                            #   created_by_role, created_by_user_id, max_uses,
│   │   │   │                            #   times_used, is_active, expires_at, created_at
│   │   │   │
│   │   │   │   ── STUDENT PROFILE (Tables 5–10) ──
│   │   │   ├── student-profiles.ts      # Table 5: profile_id, user_id(FK UNIQUE), school_id(FK),
│   │   │   │                            #   high_school_name, grade (9|10|11|12), graduation_year,
│   │   │   │                            #   date_of_birth (encrypted), state_of_residence
│   │   │   │                            #   (includes "District of Columbia"), profile_complete,
│   │   │   │                            #   onboarding_step, previous_school_ids (INT[]),
│   │   │   │                            #   created_at, updated_at
│   │   │   ├── student-academics.ts     # Table 6: academics_id, user_id(FK UNIQUE),
│   │   │   │                            #   unweighted_gpa(0.00–4.00), course_rigor, test_status,
│   │   │   │                            #   sat_score(nullable), act_score(nullable), updated_at
│   │   │   ├── extracurricular-activities.ts  # Table 7: activity_id, user_id(FK), activity_name,
│   │   │   │                            #   activity_type, years_involved, involvement_level,
│   │   │   │                            #   activity_description(300 chars), impact_text(200 chars),
│   │   │   │                            #   impact_level, display_order
│   │   │   │                            #   ── INTERNAL GUARDRAIL FIELDS (never in student APIs) ──
│   │   │   │                            #   hours_per_week, experience_duration_weeks,
│   │   │   │                            #   selective_acceptance_toggle, external_org_toggle,
│   │   │   │                            #   travel_or_residency_toggle, people_impacted,
│   │   │   │                            #   funds_raised, users_acquired, hours_delivered,
│   │   │   │                            #   company_or_institution_count,
│   │   │   │                            #   competition_top_10_pct_toggle, finalist_or_winner_toggle,
│   │   │   │                            #   publication_or_presented_toggle,
│   │   │   │                            #   policy_or_partnership_toggle,
│   │   │   │                            #   structured_deliverable_toggle,
│   │   │   │                            #   language_or_skill_cert_toggle,
│   │   │   │                            #   documented_real_world_output, formal_selection_toggle,
│   │   │   │                            #   created_at, updated_at
│   │   │   ├── honors-awards.ts         # Table 8: award_id, user_id(FK), award_name, award_level,
│   │   │   │                            #   frequency, annual_since_grade, display_order,
│   │   │   │                            #   created_at, updated_at
│   │   │   ├── community-service-entries.ts  # Table 9: service_id, user_id(FK),
│   │   │   │                            #   total_hours_range, action_type, is_leadership,
│   │   │   │                            #   description (DECISION PENDING), duration_months,
│   │   │   │                            #   display_order, created_at, updated_at
│   │   │   ├── student-essays.ts        # Table 10: essay_id, user_id(FK UNIQUE), essay_prompt,
│   │   │   │                            #   essay_text, word_count, essay_status, not_started_reason,
│   │   │   │                            #   drafted_at, revised_at, reviewed_at, finalized_at,
│   │   │   │                            #   last_major_edit_at, reflection_lock_until,
│   │   │   │                            #   major_edit_word_delta, total_edit_sessions,
│   │   │   │                            #   edits_since_draft, reviewer_type, reviewer_confirmed,
│   │   │   │                            #   finalized_confirmed, created_at, updated_at
│   │   │   │
│   │   │   │   ── SCORING ENGINE (Tables 11–12) ──
│   │   │   ├── student-scores.ts        # Table 11: score_id, user_id(FK UNIQUE), gpa_norm,
│   │   │   │                            #   rigor_norm, test_norm, test_present, gpa_contrib,
│   │   │   │                            #   rigor_contrib, test_contrib, academics_contrib,
│   │   │   │                            #   academics_cap_applied, ec_norm, ec_contrib,
│   │   │   │                            #   ec_early_strength_bonus, essay_norm, essay_contrib,
│   │   │   │                            #   awards_norm, awards_raw, awards_contrib, service_norm,
│   │   │   │                            #   service_contrib, total_score (NEVER exposed externally),
│   │   │   │                            #   readiness_band, academics_band, ec_band, essay_band,
│   │   │   │                            #   awards_band, service_band, exceptional_gate_met,
│   │   │   │                            #   foundational_floor_applied, developing_floor_applied,
│   │   │   │                            #   primary_limiter, on_track_status, has_standout_awards,
│   │   │   │                            #   has_founder_ec, has_academic_strength,
│   │   │   │                            #   has_independent_impact, calculated_at, updated_at
│   │   │   ├── student-score-history.ts # Table 12: history_id, user_id(FK), snapshot_term,
│   │   │   │                            #   grade_at_snapshot, total_score, readiness_band,
│   │   │   │                            #   academics_band, ec_band, essay_band, awards_band,
│   │   │   │                            #   service_band, primary_limiter,
│   │   │   │                            #   trend_direction (improving|declining|stable), snapshot_at
│   │   │   │
│   │   │   │   ── COLLEGES & SCHOLARSHIPS (Tables 13–16) ──
│   │   │   ├── colleges.ts              # Table 13: college_id, name, state, is_public,
│   │   │   │                            #   acceptance_rate, is_test_optional, gpa_25th, gpa_75th,
│   │   │   │                            #   sat_25th, sat_75th, act_25th, act_75th, logo_url,
│   │   │   │                            #   institution_type, region, website_url, data_source,
│   │   │   │                            #   last_data_refresh, created_at, updated_at
│   │   │   ├── student-saved-colleges.ts # Table 14: saved_college_id, user_id(FK), college_id(FK),
│   │   │   │                            #   status (saved|applied|admitted), fit_classification,
│   │   │   │                            #   intended_major, major_selectivity, is_in_state,
│   │   │   │                            #   readiness_band_at_save, saved_at, updated_at
│   │   │   ├── scholarships.ts          # Table 15: scholarship_id, scholarship_name, provider,
│   │   │   │                            #   college_id(FK nullable), eligibility_summary, deadline,
│   │   │   │                            #   award_amount, application_link (ALWAYS external URL),
│   │   │   │                            #   scholarship_type, applicable_grad_years (INT[]),
│   │   │   │                            #   data_source, last_data_refresh, created_at, updated_at
│   │   │   ├── student-saved-scholarships.ts  # Table 16: saved_scholarship_id, user_id(FK),
│   │   │   │                            #   scholarship_id(FK), is_flagged_by_advisor
│   │   │   │                            #   (NEVER returned in student APIs), saved_at
│   │   │   │
│   │   │   │   ── CONSENT & PRIVACY (Table 17) ──
│   │   │   ├── student-consents.ts      # Table 17: consent_id, user_id(FK), consent_type,
│   │   │   │                            #   status (granted|revoked), granted_at, revoked_at,
│   │   │   │                            #   source, version, created_at
│   │   │   │
│   │   │   │   ── NOTIFICATIONS (Tables 18–19) ──
│   │   │   ├── notifications.ts         # Table 18: notification_id, user_id(FK), recipient_role,
│   │   │   │                            #   notification_type, title, message, delivery_channel,
│   │   │   │                            #   is_read, is_critical, read_at, created_at
│   │   │   ├── notification-preferences.ts  # Table 19: preference_id, user_id(FK),
│   │   │   │                            #   notification_type, enabled, delivery_channel
│   │   │   │                            #   UNIQUE: (user_id, notification_type, delivery_channel)
│   │   │   │                            #   All writes MUST use ON CONFLICT DO UPDATE (upsert)
│   │   │   │
│   │   │   │   ── FEEDBACK & ANALYTICS (Tables 20–21) ──
│   │   │   ├── feedback-submissions.ts  # Table 20: feedback_id, user_id(FK), school_id(FK),
│   │   │   │                            #   feedback_type, message, screenshot_url, contact_consent,
│   │   │   │                            #   user_role, page_or_screen, app_version, device_type,
│   │   │   │                            #   platform, status (new|in_review|planned|resolved),
│   │   │   │                            #   created_at
│   │   │   ├── analytics-events.ts      # Table 21: event_id, event_name, user_id(FK),
│   │   │   │                            #   school_id(FK), grade_level, tab_name (INDEXED),
│   │   │   │                            #   platform, session_id, properties (JSONB), created_at
│   │   │   │
│   │   │   │   ── AUDIT LOG (Table 22) ──
│   │   │   └── audit-logs.ts            # Table 22: log_id, actor_user_id (NOT FK),
│   │   │                                #   actor_role, action_type, target_resource, metadata (JSONB),
│   │   │                                #   ip_address, user_agent, created_at
│   │   │                                #   CRITICAL: NO DELETE or UPDATE grants on this table ever
│   │   │
│   │   ├── migrations/                  # Auto-generated Drizzle migration SQL files
│   │   ├── seeds/                       # Dev/test seed data
│   │   └── index.ts                     # Re-exports all schema tables for clean imports
│   │
│   ├── modules/                         # Feature modules — vertical slices
│   │   │
│   │   │   ── MODULE 1: AUTH ──
│   │   │
│   │   ├── auth/
│   │   │   ├── dto/
│   │   │   │   ├── request.dto.ts       # SendOtpRequestDto, VerifyOtpRequestDto,
│   │   │   │   │                        # ValidateInviteRequestDto, SignupRequestDto
│   │   │   │   │                        #   { phone, invite_token, full_name, date_of_birth,
│   │   │   │   │                        #     graduation_year, high_school_name, state_of_residence,
│   │   │   │   │                        #     confirms_age_13_plus, confirms_parental_permission,
│   │   │   │   │                        #     college_data_share },
│   │   │   │   │                        # LoginRequestDto { phone, otp_code },
│   │   │   │   │                        # RefreshTokenRequestDto { } (cookie only — empty body)
│   │   │   │   └── response.dto.ts      # SendOtpResponseDto { expires_in_seconds: number },
│   │   │   │                            # VerifyOtpResponseDto { phone_verify_token: string },
│   │   │   │                            # InviteValidateResponseDto
│   │   │   │                            #   { school_name: string; school_id: string },
│   │   │   │                            # SignupResponseDto & LoginResponseDto
│   │   │   │                            #   { access_token, user_id, role, account_status,
│   │   │   │                            #     school_id?: string },
│   │   │   │                            # MeResponseDto
│   │   │   │                            #   { user_id, role, full_name, phone_number_masked,
│   │   │   │                            #     account_status, school_id?, grade?, graduation_year? }
│   │   │   │                            # NOTE: access_token only in memory — never localStorage
│   │   │   ├── auth.routes.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── auth.repository.ts
│   │   │   ├── auth.schema.ts           # Zod validation (synced with request DTOs)
│   │   │   └── auth.types.ts            # OtpPurpose, PhoneVerifyToken, JwtPayload, SignupResult
│   │   │
│   │   │   ── MODULE 2: STUDENTS (Profile) ──
│   │   │
│   │   ├── students/
│   │   │   ├── dto/
│   │   │   │   ├── request.dto.ts       # UpdateProfileRequestDto
│   │   │   │   │                        #   { full_name?, grade?, graduation_year?,
│   │   │   │   │                        #     high_school_name?, state_of_residence?, city? }
│   │   │   │   │                        #   At least one field required (enforced in schema)
│   │   │   │   └── response.dto.ts      # StudentProfileResponseDto
│   │   │   │                            #   { profile_id, user_id, full_name, grade,
│   │   │   │                            #     graduation_year, high_school_name,
│   │   │   │                            #     state_of_residence, school_id?, account_status,
│   │   │   │                            #     profile_complete, onboarding_step,
│   │   │   │                            #     profile_completion_pct }
│   │   │   │                            # NOTE: date_of_birth NEVER included in any response DTO
│   │   │   ├── students.routes.ts
│   │   │   ├── students.controller.ts
│   │   │   ├── students.service.ts
│   │   │   ├── students.repository.ts
│   │   │   ├── students.schema.ts
│   │   │   └── students.types.ts
│   │   │
│   │   │   ── MODULE 3: ACADEMICS ──
│   │   │
│   │   ├── academics/
│   │   │   ├── dto/
│   │   │   │   ├── request.dto.ts       # UpdateAcademicsRequestDto
│   │   │   │   │                        #   { unweighted_gpa?: number (0.0–4.0),
│   │   │   │   │                        #     course_rigor?: CourseRigorEnum,
│   │   │   │   │                        #     test_status?: TestStatusEnum,
│   │   │   │   │                        #     sat_score?: number | null,
│   │   │   │   │                        #     act_score?: number | null }
│   │   │   │   │                        #   Cross-validation: sat_score required if test_status='sat'
│   │   │   │   └── response.dto.ts      # AcademicsResponseDto
│   │   │   │                            #   { academics_id, user_id, unweighted_gpa,
│   │   │   │                            #     course_rigor, test_status, sat_score, act_score,
│   │   │   │                            #     updated_at }
│   │   │   │                            # NOTE: gpa_norm, rigor_norm, test_norm NEVER in response
│   │   │   ├── academics.routes.ts
│   │   │   ├── academics.controller.ts
│   │   │   ├── academics.service.ts
│   │   │   ├── academics.repository.ts
│   │   │   ├── academics.schema.ts
│   │   │   └── academics.types.ts
│   │   │
│   │   │   ── MODULE 4: EXTRACURRICULARS ──
│   │   │
│   │   ├── extracurriculars/
│   │   │   ├── dto/
│   │   │   │   ├── request.dto.ts       # CreateEcRequestDto & UpdateEcRequestDto
│   │   │   │   │                        #   { activity_name, activity_type, years_involved,
│   │   │   │   │                        #     involvement_level, activity_description (≤300 chars),
│   │   │   │   │                        #     impact_text (≤200 chars), impact_level,
│   │   │   │   │                        #     hours_per_week,               ← accepted but stripped from response
│   │   │   │   │                        #     experience_duration_weeks?,
│   │   │   │   │                        #     selective_acceptance_toggle?,
│   │   │   │   │                        #     external_org_toggle?,
│   │   │   │   │                        #     travel_or_residency_toggle?,
│   │   │   │   │                        #     people_impacted?, funds_raised?, users_acquired?,
│   │   │   │   │                        #     hours_delivered?, company_or_institution_count?,
│   │   │   │   │                        #     competition_top_10_pct_toggle?, finalist_or_winner_toggle?,
│   │   │   │   │                        #     publication_or_presented_toggle?,
│   │   │   │   │                        #     policy_or_partnership_toggle?,
│   │   │   │   │                        #     structured_deliverable_toggle?,
│   │   │   │   │                        #     language_or_skill_cert_toggle?,
│   │   │   │   │                        #     documented_real_world_output?,
│   │   │   │   │                        #     formal_selection_toggle? }
│   │   │   │   │                        # ReorderEcsRequestDto { ordered_ids: string[] }
│   │   │   │   └── response.dto.ts      # EcActivityResponseDto (student-safe)
│   │   │   │                            #   { activity_id, user_id, activity_name, activity_type,
│   │   │   │                            #     years_involved, involvement_level,
│   │   │   │                            #     activity_description, impact_text, impact_level,
│   │   │   │                            #     display_order, created_at, updated_at }
│   │   │   │                            # NOTE: hours_per_week + all internal guardrail toggles
│   │   │   │                            #   NEVER appear in response DTO
│   │   │   │                            # EcActivityInternalDto — scoring engine only (includes all fields)
│   │   │   ├── extracurriculars.routes.ts
│   │   │   ├── extracurriculars.controller.ts
│   │   │   ├── extracurriculars.service.ts
│   │   │   ├── extracurriculars.repository.ts
│   │   │   ├── extracurriculars.schema.ts
│   │   │   └── extracurriculars.types.ts
│   │   │
│   │   │   ── MODULE 5: AWARDS ──
│   │   │
│   │   ├── awards/
│   │   │   ├── dto/
│   │   │   │   ├── request.dto.ts       # CreateAwardRequestDto & UpdateAwardRequestDto
│   │   │   │   │                        #   { award_name: string, award_level: AwardLevelEnum,
│   │   │   │   │                        #     frequency: AwardFrequencyEnum,
│   │   │   │   │                        #     annual_since_grade?: number }
│   │   │   │   └── response.dto.ts      # AwardResponseDto
│   │   │   │                            #   { award_id, user_id, award_name, award_level,
│   │   │   │                            #     frequency, annual_since_grade, display_order,
│   │   │   │                            #     created_at, updated_at }
│   │   │   ├── awards.routes.ts
│   │   │   ├── awards.controller.ts
│   │   │   ├── awards.service.ts
│   │   │   ├── awards.repository.ts
│   │   │   ├── awards.schema.ts
│   │   │   └── awards.types.ts
│   │   │
│   │   │   ── MODULE 6: COMMUNITY SERVICE ──
│   │   │
│   │   ├── service/
│   │   │   ├── dto/
│   │   │   │   ├── request.dto.ts       # CreateServiceRequestDto & UpdateServiceRequestDto
│   │   │   │   │                        #   { total_hours_range: ServiceHoursRangeEnum,
│   │   │   │   │                        #     action_type: ServiceActionTypeEnum,
│   │   │   │   │                        #     is_leadership: boolean,
│   │   │   │   │                        #     duration_months?: number,
│   │   │   │   │                        #     description?: string }   ← excluded until confirmed
│   │   │   │   └── response.dto.ts      # ServiceEntryResponseDto
│   │   │   │                            #   { service_id, user_id, total_hours_range,
│   │   │   │                            #     action_type, is_leadership, duration_months,
│   │   │   │                            #     display_order, created_at, updated_at }
│   │   │   ├── service.routes.ts
│   │   │   ├── service.controller.ts
│   │   │   ├── service.service.ts
│   │   │   ├── service.repository.ts
│   │   │   ├── service.schema.ts
│   │   │   └── service.types.ts
│   │   │
│   │   │   ── MODULE 7: ESSAY ──
│   │   │
│   │   ├── essay/
│   │   │   ├── dto/
│   │   │   │   ├── request.dto.ts       # SaveEssayContentRequestDto
│   │   │   │   │                        #   { essay_prompt?: string, essay_text: string }
│   │   │   │   │                        # AdvanceEssayStatusRequestDto
│   │   │   │   │                        #   { target_status: EssayStatusEnum }
│   │   │   │   │                        # ReviewerConfirmRequestDto
│   │   │   │   │                        #   { reviewer_type: ReviewerTypeEnum,
│   │   │   │   │                        #     reviewer_confirmed: true }
│   │   │   │   │                        # FinalizeEssayRequestDto
│   │   │   │   │                        #   { confirmation: 'This essay reflects my best work at this time.' }
│   │   │   │   └── response.dto.ts      # EssayPublicResponseDto (student-facing — NO essay_text)
│   │   │   │                            #   { essay_id, essay_status, word_count, not_started_reason?,
│   │   │   │                            #     reflection_lock_until?, reflection_lock_active: boolean,
│   │   │   │                            #     reviewer_type?, reviewer_confirmed,
│   │   │   │                            #     finalized_confirmed, development_message: string,
│   │   │   │                            #     next_step: string, updated_at }
│   │   │   │                            # EssayAdvisorResponseDto (advisor — only with explicit consent)
│   │   │   │                            #   adds: essay_text, essay_prompt — only when
│   │   │   │                            #   advisor_essay consent = granted
│   │   │   │                            # NOTE: essay_text NEVER in student-facing DTO
│   │   │   ├── essay.routes.ts
│   │   │   ├── essay.controller.ts
│   │   │   ├── essay.service.ts
│   │   │   ├── essay.repository.ts
│   │   │   ├── essay.schema.ts
│   │   │   └── essay.types.ts
│   │   │
│   │   │   ── MODULE 8: READINESS ──
│   │   │
│   │   ├── readiness/
│   │   │   ├── dto/
│   │   │   │   ├── request.dto.ts       # RecalculateRequestDto { } (empty — user_id from JWT)
│   │   │   │   └── response.dto.ts      # ReadinessPublicResponseDto (STRICT — no internal fields)
│   │   │   │                            #   { readiness_band: ReadinessBandEnum,
│   │   │   │                            #     on_track_status: OnTrackStatusEnum,
│   │   │   │                            #     primary_limiter: string,
│   │   │   │                            #     category_statuses: {
│   │   │   │                            #       academics: CategoryStatusEnum,
│   │   │   │                            #       extracurriculars: CategoryStatusEnum,
│   │   │   │                            #       essay: CategoryStatusEnum,
│   │   │   │                            #       awards: CategoryStatusEnum,
│   │   │   │                            #       service: CategoryStatusEnum },
│   │   │   │                            #     improvement_guidance: string[],
│   │   │   │                            #     calculated_at: string }
│   │   │   │                            # ReadinessHistoryItemDto
│   │   │   │                            #   { snapshot_term, readiness_band,
│   │   │   │                            #     trend_direction, snapshot_at }
│   │   │   │                            # NOTE: total_score, *_norm, *_contrib NEVER in any DTO
│   │   │   ├── readiness.routes.ts
│   │   │   ├── readiness.controller.ts
│   │   │   ├── readiness.service.ts
│   │   │   ├── readiness.repository.ts
│   │   │   ├── readiness.schema.ts
│   │   │   └── readiness.types.ts
│   │   │
│   │   │   ── MODULE 9: SCORING ENGINE (internal — no routes) ──
│   │   │
│   │   ├── scoring-engine/
│   │   │   ├── dto/
│   │   │   │   ├── request.dto.ts       # ScoringEngineInputDto
│   │   │   │   │                        #   { user_id, grade, academics, extracurriculars[],
│   │   │   │   │                        #     essay, awards[], service[] }
│   │   │   │   │                        #   — typed interface passed from job worker to engine
│   │   │   │   └── response.dto.ts      # ScoringEngineResultDto (internal DB write shape)
│   │   │   │                            #   { gpa_norm, rigor_norm, test_norm, ..., total_score,
│   │   │   │                            #     readiness_band, academics_band, ec_band, essay_band,
│   │   │   │                            #     awards_band, service_band, primary_limiter,
│   │   │   │                            #     on_track_status, exceptional_gate_met, ... }
│   │   │   │                            #   Used only for DB writes — never serialized to API
│   │   │   ├── engine.ts
│   │   │   ├── calculators/
│   │   │   │   ├── academics.calc.ts
│   │   │   │   ├── extracurriculars.calc.ts
│   │   │   │   ├── essay.calc.ts
│   │   │   │   ├── awards.calc.ts
│   │   │   │   └── service.calc.ts
│   │   │   ├── band-mapper.ts
│   │   │   ├── gate-rules.ts
│   │   │   ├── on-track.ts
│   │   │   └── scoring-engine.types.ts
│   │   │
│   │   │   ── MODULE 10: COLLEGES ──
│   │   │
│   │   ├── colleges/
│   │   │   ├── dto/
│   │   │   │   ├── request.dto.ts       # CollegeSearchRequestDto
│   │   │   │   │                        #   { q?: string, state?: string,
│   │   │   │   │                        #     institution_type?: string, cursor?: string,
│   │   │   │   │                        #     limit?: number }
│   │   │   │   │                        # SaveCollegeRequestDto
│   │   │   │   │                        #   { college_id: string, intended_major?: string,
│   │   │   │   │                        #     major_selectivity?: MajorSelectivityEnum }
│   │   │   │   │                        # UpdateSavedCollegeRequestDto
│   │   │   │   │                        #   { status?: CollegeStatusEnum,
│   │   │   │   │                        #     intended_major?: string,
│   │   │   │   │                        #     major_selectivity?: MajorSelectivityEnum }
│   │   │   │   └── response.dto.ts      # CollegePublicResponseDto
│   │   │   │                            #   { college_id, name, state, is_public,
│   │   │   │                            #     is_test_optional, acceptance_rate, logo_url,
│   │   │   │                            #     institution_type, region, website_url }
│   │   │   │                            # NOTE: gpa_25th, sat_25th etc. NOT exposed in student DTO
│   │   │   │                            # SavedCollegeResponseDto
│   │   │   │                            #   { saved_college_id, college: CollegePublicResponseDto,
│   │   │   │                            #     status, fit_classification, intended_major,
│   │   │   │                            #     major_selectivity, is_in_state,
│   │   │   │                            #     readiness_band_at_save, saved_at }
│   │   │   ├── colleges.routes.ts
│   │   │   ├── colleges.controller.ts
│   │   │   ├── colleges.service.ts
│   │   │   ├── colleges.repository.ts
│   │   │   ├── fit-classifier/
│   │   │   │   ├── fit-classifier.ts
│   │   │   │   └── fit-classifier.types.ts
│   │   │   ├── colleges.schema.ts
│   │   │   └── colleges.types.ts
│   │   │
│   │   │   ── MODULE 11: SCHOLARSHIPS ──
│   │   │
│   │   ├── scholarships/
│   │   │   ├── dto/
│   │   │   │   ├── request.dto.ts       # ScholarshipsFilterRequestDto
│   │   │   │   │                        #   { graduation_year?: number, college_id?: string,
│   │   │   │   │                        #     scholarship_type?: string, cursor?: string }
│   │   │   │   └── response.dto.ts      # ScholarshipPublicResponseDto
│   │   │   │                            #   { scholarship_id, scholarship_name, provider,
│   │   │   │                            #     college_id?, eligibility_summary, deadline,
│   │   │   │                            #     award_amount?, application_link, scholarship_type }
│   │   │   │                            # NOTE: is_flagged_by_advisor NEVER in student DTO
│   │   │   │                            # ScholarshipAdvisorResponseDto — extends public +
│   │   │   │                            #   { is_flagged_by_advisor: boolean }  ← advisor only
│   │   │   ├── scholarships.routes.ts
│   │   │   ├── scholarships.controller.ts
│   │   │   ├── scholarships.service.ts
│   │   │   ├── scholarships.repository.ts
│   │   │   ├── scholarships.schema.ts
│   │   │   └── scholarships.types.ts
│   │   │
│   │   │   ── MODULE 12: NOTIFICATIONS ──
│   │   │
│   │   ├── notifications/
│   │   │   ├── dto/
│   │   │   │   ├── request.dto.ts       # UpdatePreferencesRequestDto
│   │   │   │   │                        #   { preferences: Array<{
│   │   │   │   │                        #       notification_type: NotificationTypeEnum,
│   │   │   │   │                        #       enabled: boolean,
│   │   │   │   │                        #       delivery_channel: DeliveryChannelEnum }> }
│   │   │   │   └── response.dto.ts      # NotificationResponseDto
│   │   │   │                            #   { notification_id, notification_type, title, message,
│   │   │   │                            #     delivery_channel, is_read, is_critical, created_at }
│   │   │   │                            # NotificationPreferenceResponseDto
│   │   │   │                            #   { notification_type, enabled, delivery_channel }
│   │   │   │                            # NotificationListResponseDto
│   │   │   │                            #   { data: NotificationResponseDto[],
│   │   │   │                            #     unread_count: number,
│   │   │   │                            #     next_cursor?, has_more }
│   │   │   ├── notifications.routes.ts
│   │   │   ├── notifications.controller.ts
│   │   │   ├── notifications.service.ts
│   │   │   ├── notifications.repository.ts
│   │   │   ├── notifications.schema.ts
│   │   │   └── notifications.types.ts
│   │   │
│   │   │   ── MODULE 13: CONSENTS ──
│   │   │
│   │   ├── consents/
│   │   │   ├── dto/
│   │   │   │   ├── request.dto.ts       # GrantConsentRequestDto
│   │   │   │   │                        #   { consent_type: ConsentTypeEnum }
│   │   │   │   │                        # RevokeConsentRequestDto
│   │   │   │   │                        #   { consent_type: ConsentTypeEnum }
│   │   │   │   │                        #   NOTE: age_13plus cannot be revoked — enforced in service
│   │   │   │   │                        # UpdateCollegeDataSharingRequestDto
│   │   │   │   │                        #   { college_data_share: boolean }
│   │   │   │   └── response.dto.ts      # ConsentRecordResponseDto
│   │   │   │                            #   { consent_id, consent_type, status,
│   │   │   │                            #     granted_at, revoked_at?, version }
│   │   │   │                            # ConsentListResponseDto
│   │   │   │                            #   { consents: ConsentRecordResponseDto[] }
│   │   │   │                            # CollegeDataSharingResponseDto
│   │   │   │                            #   { college_data_share: boolean, updated_at: string }
│   │   │   ├── consents.routes.ts
│   │   │   ├── consents.controller.ts
│   │   │   ├── consents.service.ts
│   │   │   ├── consents.repository.ts
│   │   │   ├── consents.schema.ts
│   │   │   └── consents.types.ts
│   │   │
│   │   │   ── MODULE 14: SETTINGS ──
│   │   │
│   │   ├── settings/
│   │   │   ├── dto/
│   │   │   │   ├── request.dto.ts       # SubmitFeedbackRequestDto
│   │   │   │   │                        #   { feedback_type: FeedbackTypeEnum, message: string,
│   │   │   │   │                        #     contact_consent: boolean, screenshot_url?: string }
│   │   │   │   │                        # DeleteAccountRequestDto
│   │   │   │   │                        #   { confirmation: 'DELETE' }  ← exact string enforced
│   │   │   │   └── response.dto.ts      # FeedbackSubmittedResponseDto
│   │   │   │                            #   { feedback_id: string, created_at: string }
│   │   │   │                            # DeleteAccountResponseDto
│   │   │   │                            #   { message: 'Account scheduled for deletion' }
│   │   │   ├── settings.routes.ts
│   │   │   ├── settings.controller.ts
│   │   │   ├── settings.service.ts
│   │   │   ├── settings.repository.ts
│   │   │   ├── settings.schema.ts
│   │   │   └── settings.types.ts
│   │   │
│   │   │   ── MODULE 15: SCHOOL LINKING ──
│   │   │
│   │   ├── school-linking/
│   │   │   ├── dto/
│   │   │   │   ├── request.dto.ts       # SchoolSearchRequestDto { q: string, limit?: number }
│   │   │   │   │                        # LinkSchoolRequestDto { school_id: string }
│   │   │   │   │                        # MergeConfirmRequestDto { account_id: string }
│   │   │   │   └── response.dto.ts      # SchoolSearchResultDto
│   │   │   │                            #   { school_id, name, state, address, school_type }
│   │   │   │                            # LinkSchoolResponseDto
│   │   │   │                            #   { linked: boolean, merge_required: boolean,
│   │   │   │                            #     message: string }
│   │   │   │                            # LinkedSchoolResponseDto
│   │   │   │                            #   { school_id, name, state, account_status }
│   │   │   ├── school-linking.routes.ts
│   │   │   ├── school-linking.controller.ts
│   │   │   ├── school-linking.service.ts
│   │   │   ├── school-linking.repository.ts
│   │   │   ├── school-linking.schema.ts
│   │   │   └── school-linking.types.ts
│   │   │
│   │   │   ── MODULE 16: PUSH TOKENS ──
│   │   │
│   │   ├── push-tokens/
│   │   │   ├── dto/
│   │   │   │   ├── request.dto.ts       # RegisterPushTokenRequestDto
│   │   │   │   │                        #   { token: string, platform: PlatformEnum }
│   │   │   │   └── response.dto.ts      # PushTokenResponseDto
│   │   │   │                            #   { registered: boolean, platform: string }
│   │   │   ├── push-tokens.routes.ts
│   │   │   ├── push-tokens.controller.ts
│   │   │   ├── push-tokens.service.ts
│   │   │   ├── push-tokens.repository.ts
│   │   │   ├── push-tokens.schema.ts
│   │   │   └── push-tokens.types.ts
│   │   │
│   │   │   ── MODULE 17: ANALYTICS ──
│   │   │
│   │   ├── analytics/
│   │   │   ├── dto/
│   │   │   │   ├── request.dto.ts       # AnalyticsEventDto
│   │   │   │   │                        #   { event_name: AnalyticsEventNameEnum,
│   │   │   │   │                        #     tab_name?: TabNameEnum,
│   │   │   │   │                        #     platform: PlatformEnum,
│   │   │   │   │                        #     session_id?: string,
│   │   │   │   │                        #     properties?: Record<string, unknown>,
│   │   │   │   │                        #     timestamp: string }
│   │   │   │   │                        # AnalyticsEventBatchRequestDto
│   │   │   │   │                        #   { events: AnalyticsEventDto[] }
│   │   │   │   │                        #   NOTE: essays/scores NEVER in properties payload
│   │   │   │   └── response.dto.ts      # AnalyticsBatchResponseDto
│   │   │   │                            #   { accepted: number, rejected: number }
│   │   │   ├── analytics.routes.ts
│   │   │   ├── analytics.controller.ts
│   │   │   ├── analytics.service.ts
│   │   │   ├── analytics.repository.ts
│   │   │   ├── analytics.schema.ts
│   │   │   └── analytics.types.ts
│   │   │
│   │   │   ── OTHER ROLE MODULES (stub structure) ──
│   │   │
│   │   ├── advisor/
│   │   │   ├── dto/
│   │   │   │   ├── request.dto.ts       # RosterFilterRequestDto, NoteCreateRequestDto,
│   │   │   │   │                        # TaskCreateRequestDto, FlagScholarshipRequestDto
│   │   │   │   └── response.dto.ts      # RosterStudentRowDto
│   │   │   │                            #   { student_id, full_name, grade, readiness_band,
│   │   │   │                            #     primary_gap, saved_colleges_count, trend_direction,
│   │   │   │                            #     last_active }
│   │   │   │                            # AdvisorStudentProfileDto — no numeric scores, no essay text
│   │   │   │                            #   unless consent granted
│   │   │   │                            # AdvisorNoteResponseDto, AdvisorTaskResponseDto
│   │   │   ├── advisor.routes.ts
│   │   │   ├── advisor.controller.ts
│   │   │   ├── advisor.service.ts       # RBAC: school-scoped only. Consent gates per section.
│   │   │   ├── advisor.repository.ts
│   │   │   ├── advisor.schema.ts
│   │   │   └── advisor.types.ts
│   │   │
│   │   ├── school-admin/
│   │   │   ├── dto/
│   │   │   │   ├── request.dto.ts       # SchoolOverviewRequestDto { school_id, term? }
│   │   │   │   │                        # GapAnalysisRequestDto { school_id, top_n?: number }
│   │   │   │   │                        # ExportRequestDto { report_type, filters }
│   │   │   │   └── response.dto.ts      # SchoolKpiResponseDto (aggregate only — no individual data)
│   │   │   │                            #   { active_students, band_distribution, pct_improved,
│   │   │   │                            #     avg_saved_colleges, advisor_to_student_ratio }
│   │   │   │                            # GapAnalysisResponseDto
│   │   │   │                            #   { college_name, pct_competitive_or_higher,
│   │   │   │                            #     primary_limiting_category, trend }
│   │   │   │                            # NOTE: no individual student data ever in admin DTOs
│   │   │   ├── school-admin.routes.ts
│   │   │   ├── school-admin.controller.ts
│   │   │   ├── school-admin.service.ts
│   │   │   ├── school-admin.repository.ts
│   │   │   ├── school-admin.schema.ts
│   │   │   └── school-admin.types.ts
│   │   │
│   │   └── internal-admin/
│   │       ├── dto/
│   │       │   ├── request.dto.ts       # SchoolManageRequestDto, FeedbackFilterRequestDto,
│   │       │   │                        # AuditLogQueryRequestDto, ScoringHealthRequestDto
│   │       │   └── response.dto.ts      # PlatformKpiResponseDto
│   │       │                            #   { total_schools, active_schools, total_active_students,
│   │       │                            #     global_band_distribution, avg_band_movement }
│   │       │                            # FeedbackItemResponseDto
│   │       │                            #   { feedback_id, feedback_type, message, user_role,
│   │       │                            #     school_id, page_or_screen, status, created_at }
│   │       │                            # AuditLogEntryResponseDto
│   │       │                            #   { log_id, actor_user_id, actor_role, action_type,
│   │       │                            #     target_resource, timestamp, metadata }
│   │       ├── internal-admin.routes.ts
│   │       ├── internal-admin.controller.ts
│   │       ├── internal-admin.service.ts
│   │       ├── internal-admin.repository.ts
│   │       ├── internal-admin.schema.ts
│   │       └── internal-admin.types.ts
│   │
│   ├── shared/                          # Shared utilities — reusable across all modules
│   │   │
│   │   ├── middleware/
│   │   │   ├── rate-limiter.ts          # IP + user-level throttling using Redis counters
│   │   │   ├── verify-jwt.ts            # jose JWT validation; attaches user/role/school_id to req
│   │   │   ├── require-role.ts          # RBAC: requireRole('student') — rejects with 403
│   │   │   ├── check-consent.ts         # Queries consents table; blocks if not 'granted'
│   │   │   ├── essay-guard.ts           # Anti-gaming: word count, reflection lock, status gate
│   │   │   ├── audit-logger.ts          # Immutable INSERT to audit_logs before response
│   │   │   └── score-recalc.ts          # Enqueues BullMQ score recalc job
│   │   │
│   │   ├── response/
│   │   │   ├── success.ts               # success(data, status=200) → { data, request_id }
│   │   │   ├── error.ts                 # error(code, message, details, status)
│   │   │   ├── error-codes.ts           # All SNAKE_CASE error codes enum
│   │   │   └── http-status.ts
│   │   │
│   │   ├── errors/
│   │   │   ├── app-error.ts
│   │   │   ├── validation-error.ts
│   │   │   ├── auth-error.ts
│   │   │   ├── not-found-error.ts
│   │   │   ├── conflict-error.ts
│   │   │   └── rate-limit-error.ts
│   │   │
│   │   ├── utils/
│   │   │   ├── otp.ts
│   │   │   ├── jwt.ts
│   │   │   ├── phone.ts
│   │   │   ├── pagination.ts            # encodeCursor(), decodeCursor() — cursor-based only
│   │   │   ├── crypto.ts                # encryptDob() / decryptDob() — never returned in API
│   │   │   ├── date.ts
│   │   │   └── logger.ts
│   │   │
│   │   └── types/
│   │       ├── express.d.ts             # Express Request augmentation: req.user, req.requestId
│   │       ├── jwt.types.ts             # JwtPayload
│   │       └── common.types.ts          # Paginated<T>, ApiResponse<T>, ApiError
│   │
│   ├── jobs/
│   │   ├── score-recalc.job.ts
│   │   ├── export.job.ts
│   │   └── notification.job.ts
│   │
│   ├── plugins/
│   │   ├── database.plugin.ts
│   │   ├── redis.plugin.ts
│   │   ├── auth.plugin.ts
│   │   └── error-handler.plugin.ts
│   │
│   ├── app.ts
│   └── server.ts
│
├── tests/
│   ├── unit/
│   │   ├── scoring-engine/
│   │   ├── essay/
│   │   └── fit-classifier/
│   ├── integration/
│   │   ├── auth.test.ts
│   │   ├── profile.test.ts
│   │   ├── essay.test.ts
│   │   ├── consent.test.ts
│   │   └── rbac.test.ts
│   └── load/
│       ├── roster-2000-students.test.ts
│       └── essay-queue-throughput.ts
│
├── scripts/
│   ├── migrate.ts
│   └── seed.ts
│
├── .env.example
├── .env.test
├── docker-compose.yml
├── Dockerfile
├── drizzle.config.ts
├── tsconfig.json                        # strict: true
├── vitest.config.ts
└── package.json
```