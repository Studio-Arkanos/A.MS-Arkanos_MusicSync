/** Types partagés du service de notification. */

export interface NotificationPayload {
  title: string;
  body: string;
  /** Route web ouverte au clic (ex. /track/<ref>). */
  route?: string;
  /** Référence stable du morceau concerné. */
  trackRef?: string;
}

export interface NotificationResult {
  delivered: boolean;
  reason?: string;
}
