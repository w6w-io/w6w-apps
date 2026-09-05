import type { Param } from "@w6w/types";
import { asOptionalJson, toList } from "./client.ts";

/**
 * Shared targeting params for `POST /notifications` (push/email/sms) and
 * `POST /notifications/count-unsaved`.
 *
 * OneSignal documents the four targeting modes as **mutually exclusive**:
 * `include_subscription_ids`, `included_segments` (+ `excluded_segments`),
 * `filters`, and `include_aliases` may not be combined in one request. This
 * app does not enforce that client-side — the vendor already validates it and
 * returns a clear 400 — but {@link buildTargeting} only sends the fields a
 * caller actually filled in, so leaving three of four blank does not send
 * empty arrays that could confuse that validation.
 */
export const TARGETING_PARAMS: Param[] = [
  {
    key: "includedSegments",
    label: "Included Segments",
    type: "string",
    default: "",
    hint: 'Comma-separated segment names, e.g. "Subscribed Users". Mutually exclusive with ' +
      "Subscription IDs, Filters, and Aliases.",
  },
  {
    key: "excludedSegments",
    label: "Excluded Segments",
    type: "string",
    default: "",
    hint: "Comma-separated segment names to exclude. Only used alongside Included Segments.",
  },
  {
    key: "includeSubscriptionIds",
    label: "Subscription IDs",
    type: "string",
    default: "",
    hint: "Comma-separated Subscription IDs (up to 20,000). Mutually exclusive with the " +
      "other targeting modes.",
  },
  {
    key: "includeAliases",
    label: "Aliases",
    type: "json",
    default: "",
    hint: 'Target by alias, e.g. {"external_id": ["user_123"]}. Requires Target Channel. ' +
      "Mutually exclusive with the other targeting modes.",
  },
  {
    key: "targetChannel",
    label: "Target Channel (for Aliases)",
    type: "select",
    default: "",
    options: [
      { value: "push", label: "Push" },
      { value: "email", label: "Email" },
      { value: "sms", label: "SMS" },
    ],
    hint: "Required when targeting by Aliases.",
  },
  {
    key: "filters",
    label: "Filters",
    type: "json",
    default: "",
    hint: 'Property/tag filter expressions, e.g. [{"field":"tag","key":"level","relation":"=",' +
      '"value":"10"}]. Mutually exclusive with the other targeting modes.',
  },
];

export interface TargetingInput {
  includedSegments?: string | string[];
  excludedSegments?: string | string[];
  includeSubscriptionIds?: string | string[];
  includeAliases?: unknown;
  targetChannel?: string;
  filters?: unknown;
}

/** Turn the raw form input into the subset of body fields OneSignal expects. */
export function buildTargeting(input: TargetingInput): Record<string, unknown> {
  return {
    included_segments: toList(input.includedSegments),
    excluded_segments: toList(input.excludedSegments),
    include_subscription_ids: toList(input.includeSubscriptionIds),
    include_aliases: asOptionalJson<Record<string, string[]>>(
      input.includeAliases,
      "includeAliases",
    ),
    target_channel: input.targetChannel || undefined,
    filters: asOptionalJson<unknown[]>(input.filters, "filters"),
  };
}
