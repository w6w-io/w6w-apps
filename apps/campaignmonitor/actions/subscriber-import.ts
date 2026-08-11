import type { ActionDefinition } from "@w6w/types";
import { CampaignMonitorClient, encodeId } from "../lib/client.ts";
import { asJson, consentToTrackParam, listIdParam } from "../lib/params.ts";

/**
 * `POST /api/v3.3/subscribers/{listid}/import.json` — add up to 1000
 * subscribers in one call. **List-level.**
 *
 * Use this rather than `subscriber-add` when the result has to be readable
 * immediately: the vendor contrasts them directly — add is queued, while import
 * is "instantaneous" and "the call will only return back once all subscribers
 * have been added".
 *
 * ## Partial success arrives as an ERROR
 *
 * This is the shape that surprises people. All succeed → `201 Created` with
 * `{FailureDetails: [], TotalUniqueEmailsSubmitted, TotalExistingSubscribers,
 * TotalNewSubscribers, DuplicateEmailsInSubmission}`. **Some** succeed → `400
 * Bad Request` with `{"Code":210,"Message":"Subscriber Import had some
 * failures","ResultData":{…the same counts plus per-address FailureDetails}}`.
 *
 * So a 400 here does not mean nothing happened — it usually means most of it
 * happened. The client surfaces `ResultData` verbatim in the error message
 * rather than discarding it, because that payload names exactly which addresses
 * failed and why.
 *
 * ## Limits and semantics
 *
 *  - **1000 subscribers maximum** per call (code 209); an empty batch is code 212.
 *  - Existing addresses are updated, not rejected — it is an upsert, which is
 *    why `idempotent: true`.
 *  - Automated workflow emails keyed on subscription date are **not** sent for
 *    imported subscribers unless `QueueSubscriptionBasedAutoResponders` is on.
 *  - `Resubscribe` carries the same warning as on `subscriber-add`: on, it
 *    re-activates previously unsubscribed, bounced or suppressed addresses.
 */
interface Input {
  listId: string;
  subscribers: unknown;
  consentToTrack: string;
  resubscribe?: boolean;
  queueSubscriptionBasedAutoResponders?: boolean;
  restartSubscriptionBasedAutoresponders?: boolean;
}

interface ImportResult {
  FailureDetails: Array<{ EmailAddress: string; Code: number; Message: string }>;
  TotalUniqueEmailsSubmitted: number;
  TotalExistingSubscribers: number;
  TotalNewSubscribers: number;
  DuplicateEmailsInSubmission: string[];
}

/** The vendor's hard ceiling, enforced before the request so the error is legible. */
export const MAX_SUBSCRIBERS_PER_IMPORT = 1000;

const subscriberImport: ActionDefinition<Input, ImportResult> = {
  key: "subscriber-import",
  type: "perform",
  resource: "subscriber",
  title: "Import Subscribers",
  description:
    "Add or update up to 1000 subscribers in one synchronous call. A partial failure is returned " +
    "as a 400 with code 210 whose ResultData names each failed address.",
  idempotent: true,
  params: [
    listIdParam,
    {
      key: "subscribers",
      label: "Subscribers",
      type: "json",
      required: true,
      hint: "A JSON array of up to 1000 objects, each {EmailAddress, Name?, MobileNumber?, " +
        "CustomFields?, ConsentToTrack?, ConsentToSendSms?}. A per-subscriber ConsentToTrack " +
        "overrides the batch-level one below.",
    },
    {
      ...consentToTrackParam,
      label: "Consent to track (batch default)",
      hint:
        "Applied to every subscriber that does not carry its own ConsentToTrack. Required by the " +
        "API (error 214).",
    },
    {
      key: "resubscribe",
      label: "Resubscribe",
      type: "boolean",
      hint: "Off by default. On, previously unsubscribed, bounced or suppressed addresses in the " +
        "batch are re-added to the active list — use with caution.",
    },
    {
      key: "queueSubscriptionBasedAutoResponders",
      label: "Queue subscription-based automated emails",
      type: "boolean",
      hint: "Off by default: imported subscribers do NOT trigger automated emails keyed on their " +
        "subscription date unless this is on.",
    },
    {
      key: "restartSubscriptionBasedAutoresponders",
      label: "Restart automated sequences on resubscribe",
      type: "boolean",
    },
  ],
  output: [
    { key: "TotalUniqueEmailsSubmitted", type: "number", label: "Unique addresses submitted" },
    { key: "TotalNewSubscribers", type: "number", label: "Newly added" },
    { key: "TotalExistingSubscribers", type: "number", label: "Already present, so updated" },
    { key: "DuplicateEmailsInSubmission", type: "array", label: "Addresses repeated in the batch" },
    { key: "FailureDetails", type: "array", label: "Per-address failures (empty on full success)" },
  ],

  execute(input, ctx) {
    const subscribers = asJson<Array<Record<string, unknown>>>(input.subscribers, "Subscribers");
    if (!Array.isArray(subscribers) || subscribers.length === 0) {
      throw new Error("Subscribers must be a non-empty JSON array");
    }
    if (subscribers.length > MAX_SUBSCRIBERS_PER_IMPORT) {
      // Checked here so the caller gets a legible message rather than code 209
      // after uploading the whole batch.
      throw new Error(
        `Campaign Monitor accepts at most ${MAX_SUBSCRIBERS_PER_IMPORT} subscribers per import; ` +
          `got ${subscribers.length}. Split the batch.`,
      );
    }
    return new CampaignMonitorClient(ctx).json<ImportResult>(
      `/subscribers/${encodeId(input.listId)}/import`,
      {
        method: "POST",
        body: {
          Subscribers: subscribers.map((s) => ({
            ConsentToTrack: input.consentToTrack,
            ...s,
          })),
          Resubscribe: input.resubscribe ?? false,
          QueueSubscriptionBasedAutoResponders: input.queueSubscriptionBasedAutoResponders ?? false,
          RestartSubscriptionBasedAutoresponders: input.restartSubscriptionBasedAutoresponders ??
            false,
        },
      },
    );
  },
};

export default subscriberImport;
