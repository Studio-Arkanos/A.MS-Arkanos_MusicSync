import { Capacitor } from '@capacitor/core';
import AmsNative from '../../plugins/amsNative';

/**
 * Notifications.
 *
 * Implémentation native RÉELLE (canal Android
 * « décisions », deep-link vers l'écran du morceau).
 * Android 13+ : la permission POST_NOTIFICATIONS
 * est demandée au RUNTIME avant l'envoi — jamais
 * supposée acquise.
 *
 * Sur le web (navigateur de développement), les
 * appels échouent proprement — aucune notification
 * n'est jamais signalée comme envoyée si elle
 * ne l'est pas.
 */

import type { NotificationPayload, NotificationResult } from './types';

export interface NotificationService {
  /** Demande la permission runtime (Android 13+). */
  ensurePermission(): Promise<boolean>;
  notify(payload: NotificationPayload): Promise<NotificationResult>;
}

export class NativeNotificationService implements NotificationService {
  /**
   * Vrai si la notification peut être envoyée :
   * Android < 13 (pas de permission), permission
   * déjà accordée, ou accord accordé à la demande.
   */
  async ensurePermission(): Promise<boolean> {
    if (!Capacitor.isNativePlatform()) return false;
    try {
      const { granted } = await AmsNative.requestNotificationPermission();
      return granted;
    } catch {
      return false;
    }
  }

  async notify(payload: NotificationPayload): Promise<NotificationResult> {
    // Android 13+ : demande runtime si nécessaire.
    const permission = await this.ensurePermission();
    if (!permission && Capacitor.isNativePlatform()) {
      return {
        delivered: false,
        reason: 'NOTIFICATIONS_PERMISSION_DENIED',
      };
    }
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
