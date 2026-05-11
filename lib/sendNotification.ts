// =============================================================================
// lib/sendNotification.ts — universal helper for all 4 feedback projects
// =============================================================================
// Drop at: lib/sendNotification.ts in each project repo (identical across all 4).
//
// Calls the ai-solutions dashboard's /api/feedback-notifications endpoint, which
// sends a Gmail SMTP email (uses GMAIL_USER + GMAIL_APP_PASSWORD on ai-solutions).
//
// Pattern matches existing feedback-notification-setup.md (Section 4), with the
// Resend → Gmail switch per CRITICAL_UPDATE_EMAIL_SERVICE_GMAIL_ONLY (May 10).
// =============================================================================

export type FeedbackStatus = 'submitted' | 'planned' | 'in_progress' | 'released';
export type RagScore = 'GREEN' | 'AMBER' | 'RED';

export interface NotificationData {
  tester_email: string;
  artifact_name: string;
  rag_score?: RagScore;
  status_change?: FeedbackStatus;
  feedback_id?: string;
}

/**
 * Sends a feedback notification email via the ai-solutions dashboard API.
 * Fire-and-forget by default — does not throw on email failure (logs only).
 *
 * Required env var on the calling project: NEXT_PUBLIC_DASHBOARD_API_URL
 */
export async function sendFeedbackNotification(data: NotificationData): Promise<boolean> {
  try {
    const dashboardBase = process.env.NEXT_PUBLIC_DASHBOARD_API_URL?.replace('/artifacts', '');
    if (!dashboardBase) {
      console.warn('NEXT_PUBLIC_DASHBOARD_API_URL not set — skipping notification');
      return false;
    }

    const response = await fetch(`${dashboardBase}/feedback-notifications`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const result = await response.json().catch(() => ({}));
      console.error('Notification failed:', result.error || response.status);
      return false;
    }

    return true;
  } catch (error) {
    console.error('sendFeedbackNotification error:', error);
    return false;
  }
}
