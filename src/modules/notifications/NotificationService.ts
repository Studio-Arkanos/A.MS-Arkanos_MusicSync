/**
 * Notifications.
 *
 * Étape 2 : implémentation native RÉELLE (canal Android
 * « décisions », deep-link vers l'écran du morceau).
 * Sur le web (navigateur de développement), l'appel échoue
 * proprement — jamais de notification signalée comme envoyée
 * si elle ne l'est pas.
 */

import AmsNative from '../../plugins/amsNative';

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

export interface NotificationService {
  notify(payload: NotificationPayload): Promise<NotificationResult>;
}

export class NativeNotificationService implements NotificationService {
  async notify(payload: NotificationPayload): Promise<NotificationResult> {
    try {
      const result = await AmsNative.notify({
        title: payload.title,
        message: payload.body,
        route: payload.route,
        trackRef: payload.trackRef,
      });
      return { delivered: result.delivered };
    } catch (error) {
      return {
        delivered: false,
        reason: `NOTIFICATION_FAILED : ${(error as Error).message}`,
      };
    }
  }
}
