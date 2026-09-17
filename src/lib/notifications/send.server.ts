/**
 * Web Push delivery. Server-only: VAPID keys are read from process.env inside
 * the functions, never at module scope, and never returned to the client.
 */
import { buildPushPayload } from "@block65/webcrypto-web-push";

import type { NotificationPayload } from "./types";

export interface StoredSubscription {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

function vapid() {
  const publicKey = process.env["VAPID_PUBLIC_KEY"];
  const privateKey = process.env["VAPID_PRIVATE_KEY"];
  const subject = process.env["VAPID_SUBJECT"] ?? "mailto:coach@fitcoachassistantai.lovable.app";
  if (!publicKey || !privateKey) throw new Error("Push notifications are not configured");
  return { publicKey, privateKey, subject };
}

export interface SendResult {
  sent: number;
  /** Subscription ids that the push service rejected permanently (404/410). */
  gone: string[];
}

/** Sends one payload to every subscription of a user. */
export async function sendToSubscriptions(
  subscriptions: StoredSubscription[],
  payload: NotificationPayload,
): Promise<SendResult> {
  const keys = vapid();
  const result: SendResult = { sent: 0, gone: [] };

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        const request = await buildPushPayload(
          {
            data: {
              kind: payload.kind,
              title: payload.title,
              body: payload.body,
              url: payload.url,
              tag: payload.dedupeKey,
            },
            options: { ttl: 60 * 60 * 4, urgency: "normal" },
          },
          {
            endpoint: subscription.endpoint,
            expirationTime: null,
            keys: { p256dh: subscription.p256dh, auth: subscription.auth },
          },
          keys,
        );

        const response = await fetch(subscription.endpoint, {
          method: request.method,
          headers: request.headers,
          body: request.body as unknown as BodyInit,
        });

        if (response.status === 404 || response.status === 410) {
          result.gone.push(subscription.id);
          return;
        }
        if (response.ok) result.sent += 1;
        else console.error("[push] delivery failed", response.status);
      } catch (error) {
        console.error("[push] delivery error", error instanceof Error ? error.message : error);
      }
    }),
  );

  return result;
}
