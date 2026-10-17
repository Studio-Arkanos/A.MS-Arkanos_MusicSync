/**
 * Notifications.
 *
 * Module PRÉPARÉ à l'étape 1 : la couche native (notifications locales)
 * sera implémentée à l'étape 3. Le service web délègue au plugin
 * AmsNative et signale honnêtement l'indisponibilité.
 */

import AmsNative from '../../plugins/amsNative';

export interface NotificationPayload {
  title: string;
  body: string;
  id?: string;
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
      await AmsNative.notify({ title: payload.title, message: payload.body });
      return { delivered: true };
    } catch {
      return {
        delivered: false,
        reason: 'NOTIFICATIONS_NOT_IMPLEMENTED : les notifications locales arrivent à l’étape 3.',
      };
    }
  }
}
