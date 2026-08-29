import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments and enum option lists for the Dialpad actions.
 *
 * Every enum here is transcribed from Dialpad's own OpenAPI 3.1 document
 * (fetched 2026-08-29 from `dash.readme.com/api/v1/api-registry/cwu1asmtbsrjuf`,
 * the registry id `developers.dialpad.com/reference` itself resolves), not
 * inferred or guessed from a sibling app.
 */

/** The `cursor` pagination param every list endpoint takes. Never a page number. */
export const cursorParam: Param = {
  key: "cursor",
  label: "Cursor",
  type: "string",
  hint: "Pass the `cursor` from a previous page's response to fetch the next page. Leave empty " +
    "for the first page.",
};

/**
 * `target_type` — the entity kinds Dialpad routes calls, SMS and events
 * against. One shared enum: every endpoint that takes a target uses this exact
 * vocabulary (`protos.*.TargetType`), never a per-endpoint subset.
 */
export const targetTypeOptions = [
  { value: "callcenter", label: "Call center" },
  { value: "callrouter", label: "Call router" },
  { value: "channel", label: "Channel" },
  { value: "coachinggroup", label: "Coaching group" },
  { value: "coachingteam", label: "Coaching team" },
  { value: "department", label: "Department" },
  { value: "office", label: "Office" },
  { value: "room", label: "Room" },
  { value: "staffgroup", label: "Staff group" },
  { value: "unknown", label: "Unknown" },
  { value: "user", label: "User" },
];

/** The subset of {@link targetTypeOptions} a `sender_group_type` (SMS) or a call router's default target may be. */
export const groupTypeOptions = [
  { value: "callcenter", label: "Call center" },
  { value: "department", label: "Department" },
  { value: "office", label: "Office" },
];

/** `protos.user.UserProto.license` / the license a new or updated user is given. Affects billing. */
export const licenseOptions = [
  { value: "admins", label: "Admins" },
  { value: "agents", label: "Agents (Sell license)" },
  { value: "dpde_all", label: "Digital & Phone (all)" },
  { value: "dpde_one", label: "Digital & Phone (one)" },
  { value: "lite_lines", label: "Lite lines" },
  { value: "lite_support_agents", label: "Lite support agents" },
  { value: "magenta_lines", label: "Magenta lines" },
  { value: "talk", label: "Talk (default)" },
  { value: "user", label: "User" },
];

/** `protos.user.UserProto.state`, as accepted by the `users.list` filter. */
export const userStateOptions = [
  { value: "active", label: "Active (default)" },
  { value: "all", label: "All" },
  { value: "cancelled", label: "Cancelled" },
  { value: "deleted", label: "Deleted" },
  { value: "pending", label: "Pending" },
  { value: "suspended", label: "Suspended" },
];

/**
 * `protos.call_event_subscription.CallState` — every state a call event
 * subscription can be scoped to. `"all"` is itself one of the documented
 * values, not a UI convenience meaning "every state below".
 */
export const callStateOptions = [
  { value: "all", label: "All states" },
  { value: "admin", label: "Admin" },
  { value: "admin_recording", label: "Admin recording" },
  { value: "ai_playbook", label: "Ai playbook" },
  { value: "barge", label: "Barge" },
  { value: "blocked", label: "Blocked" },
  { value: "call_moments", label: "Call moments" },
  { value: "call_transcription", label: "Call transcription" },
  { value: "calling", label: "Calling" },
  { value: "connected", label: "Connected" },
  { value: "csat", label: "CSAT" },
  { value: "dispositions", label: "Dispositions" },
  { value: "hangup", label: "Hangup" },
  { value: "hold", label: "Hold" },
  { value: "merged", label: "Merged" },
  { value: "missed", label: "Missed" },
  { value: "monitor", label: "Monitor" },
  { value: "parked", label: "Parked" },
  { value: "pcsat", label: "PCSAT" },
  { value: "postcall", label: "Post-call" },
  { value: "preanswer", label: "Pre-answer" },
  { value: "queued", label: "Queued" },
  { value: "recap_action_items", label: "Recap: action items" },
  { value: "recap_outcome", label: "Recap: outcome" },
  { value: "recap_purposes", label: "Recap: purposes" },
  { value: "recap_summary", label: "Recap: summary" },
  { value: "recording", label: "Recording" },
  { value: "ringing", label: "Ringing" },
  { value: "takeover", label: "Takeover" },
  { value: "transcription", label: "Transcription" },
  { value: "voicemail", label: "Voicemail" },
  { value: "voicemail_uploaded", label: "Voicemail uploaded" },
];

/** Comma-joined `multiselect` value, or the string a user typed, into the array Dialpad's JSON body wants. */
export function toStringArray(v: string[] | string | undefined | null): string[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const items = (Array.isArray(v) ? v : v.split(","))
    .map((s) => String(s).trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

/** `id`/`office_id`/… fields Dialpad returns and expects as `int64`. Coerce a string param to a number when set. */
export function toInt(v: string | number | undefined | null): number | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  const n = typeof v === "number" ? v : Number(v);
  if (!Number.isFinite(n)) throw new Error(`expected an integer id, got ${JSON.stringify(v)}`);
  return n;
}

export const officeIdParam: Param = {
  key: "officeId",
  label: "Office ID",
  type: "string",
  hint: "The office's numeric id. Look one up with the List Offices action.",
};

export const targetTypeParam: Param = {
  key: "targetType",
  label: "Target type",
  type: "select",
  options: targetTypeOptions,
  hint: "Must be provided whenever a target id is provided.",
};
