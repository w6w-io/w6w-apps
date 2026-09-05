/**
 * OneSignal — push, email, SMS, and in-app messaging, over the current REST
 * API (`api.onesignal.com`, App API key auth).
 *
 * Every path, header, and body field in this app was verified on 2026-09-05
 * against OneSignal's own OpenAPI 3.1 document
 * (`documentation.onesignal.com/openapi.json`, 1,472,928 bytes, `info.version`
 * `11.6`), the "REST API overview" / "Keys & IDs" / "Rate limits and error
 * handling" guides, and live probes against `api.onesignal.com` and
 * `status.onesignal.com`. Nothing here came from a third-party integration
 * directory.
 *
 * Four findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **Two key generations coexist, and only one can still be created.**
 *     OneSignal's November 2024 App/Organization API keys
 *     (`os_v2_app_...`) are current; the legacy REST API key and User Auth
 *     key still authenticate, but "the management UI for them has been
 *     removed and new keys cannot be created" (Keys & IDs, verbatim). This
 *     app is built only against the current App API key
 *     (`auth/api-key.ts`).
 *  2. **App key vs Organization key is a hard split, not a permission tier.**
 *     A disjoint set of endpoints — list/create apps, update an app's
 *     platform config, API-key management, audit logs — requires an
 *     Organization API key instead, verified from each operation's own
 *     `Authorization` parameter description. None of those are implemented
 *     here, so every action in this app works with a plain App API key
 *     (`lib/client.ts`).
 *  3. **`GET /apps/{app_id}` hands back live push credentials** — a full
 *     Firebase service-account private key
 *     (`fcm_v1_service_account_json`), APNs signing material (`apns_p8`,
 *     `apns_certificates`, `safari_apns_certificate`), and the legacy
 *     `gcm_key`. `actions/view-app.ts` strips all of them before returning,
 *     and the credential-liveness probe deliberately reads `/segments`
 *     instead of this endpoint for the same reason.
 *  4. **The `?c=push`/`?c=email`/`?c=sms` split in OneSignal's own reference
 *     docs is a documentation artifact, not a real query parameter** — the
 *     vendor's own curl example posts to the bare `/notifications` with no
 *     query string, and the channel is inferred from which body fields are
 *     present. See `actions/send-email.ts`.
 *
 * Two smaller traps worth knowing about: `GET /notifications`'s `kind` filter
 * looks like a channel selector but actually means "how was this message
 * created" (dashboard/API/automated) — see `actions/view-messages.ts` — and
 * `DELETE /apps/{app_id}/users/by/...` answers `202` with the deleted user's
 * `identity` in the body, not an empty response.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import sendPush from "./actions/send-push.ts";
import sendEmail from "./actions/send-email.ts";
import sendSms from "./actions/send-sms.ts";
import estimateRecipients from "./actions/estimate-recipients.ts";
import viewMessages from "./actions/view-messages.ts";
import viewMessage from "./actions/view-message.ts";
import cancelMessage from "./actions/cancel-message.ts";

import createUser from "./actions/create-user.ts";
import viewUser from "./actions/view-user.ts";
import updateUser from "./actions/update-user.ts";
import deleteUser from "./actions/delete-user.ts";

import createSubscription from "./actions/create-subscription.ts";
import updateSubscription from "./actions/update-subscription.ts";
import deleteSubscription from "./actions/delete-subscription.ts";

import createSegment from "./actions/create-segment.ts";
import viewSegments from "./actions/view-segments.ts";
import deleteSegment from "./actions/delete-segment.ts";

import createCustomEvent from "./actions/create-custom-event.ts";
import viewApp from "./actions/view-app.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Notifications
    sendPush,
    sendEmail,
    sendSms,
    estimateRecipients,
    viewMessages,
    viewMessage,
    cancelMessage,
    // Users
    createUser,
    viewUser,
    updateUser,
    deleteUser,
    // Subscriptions
    createSubscription,
    updateSubscription,
    deleteSubscription,
    // Segments
    createSegment,
    viewSegments,
    deleteSegment,
    // Custom events
    createCustomEvent,
    // App
    viewApp,
  ],
  // App API key only — see the module doc above for why the legacy key and
  // the Organization-key endpoints are both deliberately out of scope.
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
