import type { NotificationsRepository } from "./notifications.repository.js";
import type {
  CreateNotificationPayload,
  NotificationChannel,
  RecipientRole,
  NotificationRecord,
  NotificationPreferenceRecord,
} from "./notifications.types.js";
import type {
  ListNotificationsResponseDto,
  NotificationItemDto,
  MarkReadResponseDto,
  MarkAllReadResponseDto,
  UnreadCountResponseDto,
  ListPreferencesResponseDto,
  UpdatePreferencesResponseDto,
} from "./dto/response.dto.js";
import type { UpdatePreferencesDto } from "./dto/request.dto.js";
import { AuthError } from "../../../shared/errors/auth-error.js";
import { AuthErrorCode } from "../../../shared/response/error-codes.js";

// ── Consent mapping: notification type → required consent_type ───────────────
const CONSENT_MAP: Record<string, string | null> = {
  readiness_band_update: null,          // Always allowed
  improvement_recommendation: null,
  essay_feedback_ready: "advisor_essay", // Only if advisor has essay access
  essay_development_milestone: null,
  saved_college_gap_alert: null,
  scholarship_deadline_reminder: null,
  missing_section_reminder: null,
  senior_readiness_check: null,
  onboarding_progress: null,
};

export class NotificationsService {
  constructor(private readonly repo: NotificationsRepository) {}

  // ═══════════════════════════════════════════════════════════════════════════
  // Core: Create notification (called by cron jobs + real-time triggers)
  // ═══════════════════════════════════════════════════════════════════════════

  async createNotification(payload: CreateNotificationPayload): Promise<number | null> {
    try {
      // 1. Check consent for this notification type (students only)
      const hasConsent = await this.checkConsentGating(
        payload.recipientId,
        payload.recipientRole,
        payload.notificationType,
      );

      if (!hasConsent && !payload.isCritical) {
        console.log(
          `[NotificationService] Consent missing, skipping: ${payload.notificationType} for user ${payload.recipientId}`,
        );
        return null;
      }

      // 2. Insert in-app notification record (always created)
      const notificationId = await this.repo.insertNotification({
        recipient_user_id: payload.recipientId,
        recipient_role: payload.recipientRole,
        notification_type: payload.notificationType,
        title: payload.title,
        message: payload.message,
        delivery_channel: "in_app",
        is_read: false,
        is_critical: payload.isCritical,
        metadata: payload.metadata ? JSON.stringify(payload.metadata) : null,
      });

      // 3. Dispatch to external channels (push, email) asynchronously
      await this.dispatchToChannels(payload, notificationId);

      console.log(
        `[NotificationService] Created notification #${notificationId} (${payload.notificationType}) for ${payload.recipientRole}:${payload.recipientId}`,
      );

      return notificationId;
    } catch (err) {
      console.error("[NotificationService] createNotification error:", err);
      // Graceful degradation — log but don't crash the caller
      throw err;
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // API: List notifications
  // ═══════════════════════════════════════════════════════════════════════════

  async listNotifications(
    studentId: number,
    query: {
      isRead?: boolean;
      type?: string;
      limit: number;
      cursor?: string;
    },
  ): Promise<ListNotificationsResponseDto> {
    const clampedLimit = Math.min(Math.max(query.limit, 1), 100);

    const { rows, hasMore } = await this.repo.listNotifications(
      studentId,
      "student",
      { ...query, limit: clampedLimit },
    );

    const unreadCount = await this.repo.getUnreadCount(studentId, "student");

    // Build cursor for next page
    let nextCursor: string | null = null;
    if (hasMore && rows.length > 0) {
      const lastRow = rows[rows.length - 1];
      const raw = `${lastRow.notification_id}:${lastRow.created_at.toISOString()}`;
      nextCursor = Buffer.from(raw).toString("base64");
    }

    return {
      notifications: rows.map(this.mapToDto),
      unread_count: unreadCount,
      next_cursor: nextCursor,
      has_more: hasMore,
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // API: Mark single notification as read
  // ═══════════════════════════════════════════════════════════════════════════

  async markAsRead(studentId: number, notificationId: number): Promise<MarkReadResponseDto> {
    const notif = await this.repo.findNotificationById(notificationId);

    if (!notif || notif.recipient_user_id !== studentId || notif.recipient_role !== "student") {
      throw new AuthError(AuthErrorCode.NOT_FOUND, "Notification not found", 404);
    }

    await this.repo.markAsRead(notificationId);

    return { marked_read: true, notification_id: notificationId };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // API: Mark all notifications as read
  // ═══════════════════════════════════════════════════════════════════════════

  async markAllAsRead(studentId: number): Promise<MarkAllReadResponseDto> {
    const count = await this.repo.markAllAsRead(studentId, "student");
    return { marked_count: count };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // API: Get unread count
  // ═══════════════════════════════════════════════════════════════════════════

  async getUnreadCount(studentId: number): Promise<UnreadCountResponseDto> {
    const count = await this.repo.getUnreadCount(studentId, "student");
    return { unread_count: count };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // API: List notification preferences
  // ═══════════════════════════════════════════════════════════════════════════

  async listPreferences(studentId: number): Promise<ListPreferencesResponseDto> {
    const prefs = await this.repo.listPreferences(studentId, "student");
    return {
      preferences: prefs.map((p) => ({
        notification_type: p.notification_type,
        delivery_channel: p.delivery_channel,
        enabled: p.enabled,
        is_critical: p.is_critical,
      })),
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // API: Update notification preferences
  // ═══════════════════════════════════════════════════════════════════════════

  async updatePreferences(
    studentId: number,
    dto: UpdatePreferencesDto,
  ): Promise<UpdatePreferencesResponseDto> {
    let updatedCount = 0;
    let skippedCritical = 0;

    for (const pref of dto.preferences) {
      // Check if this is a critical notification — cannot disable
      const isCritical = await this.repo.isPreferenceCritical(
        studentId,
        pref.notification_type,
      );

      if (isCritical && !pref.enabled) {
        skippedCritical++;
        continue; // Silently skip critical disable attempts
      }

      await this.repo.upsertPreference({
        recipient_id: studentId,
        recipient_role: "student",
        notification_type: pref.notification_type,
        delivery_channel: pref.delivery_channel,
        enabled: pref.enabled,
      });

      updatedCount++;
    }

    return { updated_count: updatedCount, skipped_critical: skippedCritical };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Private: Consent gating
  // ═══════════════════════════════════════════════════════════════════════════

  private async checkConsentGating(
    recipientId: number,
    recipientRole: RecipientRole,
    notificationType: string,
  ): Promise<boolean> {
    // Advisors/admins: always allowed (internal users)
    if (recipientRole !== "student") return true;

    const requiredConsent = CONSENT_MAP[notificationType];
    // null = no consent requirement → always allowed
    if (requiredConsent === null || requiredConsent === undefined) return true;

    return this.repo.checkStudentConsent(recipientId, requiredConsent);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // Private: Dispatch to push/email channels
  // ═══════════════════════════════════════════════════════════════════════════

  private async dispatchToChannels(
    payload: CreateNotificationPayload,
    notificationId: number,
  ): Promise<void> {
    const channelPromises = payload.deliveryChannels
      .filter((ch) => ch !== "in_app") // in_app already handled
      .map(async (channel) => {
        try {
          // Check user preference for this channel
          const pref = await this.repo.getChannelPreference(
            payload.recipientId,
            payload.recipientRole,
            channel,
          );

          // Default: push enabled, email disabled for students
          const defaultEnabled = channel === "push";
          if (pref && !pref.enabled) return;
          if (!pref && !defaultEnabled) return;

          if (channel === "push") {
            await this.dispatchPush(payload, notificationId);
          } else if (channel === "email") {
            await this.dispatchEmail(payload, notificationId);
          }
        } catch (err) {
          // Graceful degradation: log but don't fail the notification
          console.error(
            `[NotificationService] Failed to dispatch ${channel} for notification #${notificationId}:`,
            err,
          );
        }
      });

    await Promise.allSettled(channelPromises);
  }

  // ── Push dispatch (stub — log to console in dev) ─────────────────────────

  private async dispatchPush(
    payload: CreateNotificationPayload,
    notificationId: number,
  ): Promise<void> {
    // STUB: Replace with FCM/APNs integration in production
    console.log(
      `[push:stub] 📱 Push notification #${notificationId} → ` +
      `${payload.recipientRole}:${payload.recipientId} — "${payload.title}"`,
    );
  }

  // ── Email dispatch (stub — log to console in dev) ────────────────────────

  private async dispatchEmail(
    payload: CreateNotificationPayload,
    notificationId: number,
  ): Promise<void> {
    // STUB: Replace with SendGrid integration in production
    console.log(
      `[email:stub] 📧 Email notification #${notificationId} → ` +
      `${payload.recipientRole}:${payload.recipientId} — "${payload.title}"`,
    );
  }

  // ── Map DB record → API DTO ──────────────────────────────────────────────

  private mapToDto(record: NotificationRecord): NotificationItemDto {
    let parsedMetadata: Record<string, unknown> | null = null;
    if (record.metadata) {
      try {
        parsedMetadata = JSON.parse(record.metadata);
      } catch {
        parsedMetadata = null;
      }
    }

    return {
      notification_id: record.notification_id,
      notification_type: record.notification_type,
      title: record.title,
      message: record.message,
      delivery_channel: record.delivery_channel,
      is_read: record.is_read,
      is_critical: record.is_critical,
      metadata: parsedMetadata,
      created_at: record.created_at.toISOString(),
      read_at: record.read_at?.toISOString() ?? null,
    };
  }
}
