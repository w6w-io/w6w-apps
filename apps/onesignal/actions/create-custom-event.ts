import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, OneSignalClient, resolveAppId } from "../lib/client.ts";

interface Input {
  name: string;
  externalId?: string;
  onesignalId?: string;
  properties?: unknown;
  timestamp?: string;
  idempotencyKey?: string;
}

/**
 * `POST /apps/{app_id}/custom_events` — verified against the OpenAPI
 * document. The vendor's endpoint accepts a **batch** (`events: [...]`); this
 * action sends a batch of exactly one, which is the natural shape for a
 * single workflow step, and surfaces the response's own partial-success
 * report.
 *
 * ## `202` does not mean the event was accepted
 *
 * Documented directly on the `202` response: the body lists any individual
 * events that could not be processed — most commonly because
 * `external_id`/`onesignal_id` did not resolve to a real user — while an
 * *empty* `errors` array (or no body at all) means it was. A caller reading
 * only the HTTP status would treat a silently-dropped event as a success.
 * `output.accepted` is derived from that field so a workflow can branch on it
 * without re-deriving the same logic.
 *
 * Rate-limited independently from Create Message; request-size limits are
 * 2,024 bytes per event and 1 MB per request (per `/reference/rate-limits`).
 */
const createCustomEvent: ActionDefinition<Input> = {
  key: "create-custom-event",
  type: "perform",
  resource: "custom-event",
  title: "Create Custom Event",
  description: "Record a custom event for a user, to trigger Journeys or drive segmentation.",
  idempotent: true,
  params: [
    { key: "name", label: "Event Name", type: "string", required: true },
    {
      key: "externalId",
      label: "External ID",
      type: "string",
      default: "",
      hint: "Either External ID or OneSignal ID is required.",
    },
    { key: "onesignalId", label: "OneSignal ID", type: "string", default: "" },
    {
      key: "properties",
      label: "Properties",
      type: "json",
      default: "",
      hint: 'e.g. {"geography": "USA"}',
    },
    {
      key: "timestamp",
      label: "Timestamp",
      type: "datetime",
      default: "",
      hint: "ISO 8601. Defaults to now; a future timestamp is reset to now by the vendor.",
      advanced: true,
    },
    {
      key: "idempotencyKey",
      label: "Idempotency Key",
      type: "string",
      default: "",
      advanced: true,
    },
  ],
  output: [
    { key: "accepted", type: "boolean", label: "Accepted with no per-event error" },
    { key: "errors", type: "array", label: "Per-event errors, if any" },
  ],

  async execute(input, ctx) {
    const appId = resolveAppId(ctx.connection);
    const event = compact({
      name: input.name,
      external_id: input.externalId,
      onesignal_id: input.onesignalId,
      properties: asOptionalJson(input.properties, "properties"),
      timestamp: input.timestamp,
      idempotency_key: input.idempotencyKey || ctx.invocation?.invocationId,
    });
    const result = await new OneSignalClient(ctx).json<{ errors?: unknown[] }>(
      `/apps/${encodeURIComponent(appId)}/custom_events`,
      { method: "POST", body: { events: [event] } },
    );
    const errors = result?.errors ?? [];
    return { accepted: errors.length === 0, errors };
  },
};

export default createCustomEvent;
