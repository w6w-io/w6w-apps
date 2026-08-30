import type { ActionDefinition } from "@w6w/types";
import { encodeId, VideoAskClient } from "../lib/client.ts";
import { formIdParam, organizationIdParam } from "../lib/params.ts";

/**
 * `GET /forms/{form_id}/metrics` — landed/interacted/answered/completed
 * counts over an interval, plus a per-bucket breakdown in `data`.
 *
 * `interval=weekly` is the only value shown in the vendor's own example and
 * documented in prose ("weeks will start on Mondays and end on Sundays; if
 * the given start/end doesn't land on a week boundary, the whole containing
 * week is included") — so it is the default here, but sent explicitly rather
 * than assumed, in case the account holds other interval values that were
 * simply not captured in the example.
 */
interface Input {
  formId: string;
  interval?: string;
  since?: string;
  until?: string;
  organizationId?: string;
}

const formMetricsGet: ActionDefinition<Input> = {
  key: "form-metrics-get",
  type: "read",
  resource: "form",
  title: "Get Form Metrics",
  description:
    "Read a form's landed/interacted/answered/completed totals and per-interval breakdown.",
  params: [
    formIdParam,
    {
      key: "interval",
      label: "Interval",
      type: "string",
      default: "weekly",
      hint: 'The only value the vendor documents an example for is "weekly".',
    },
    { key: "since", label: "Since (YYYY-MM-DD)", type: "date" },
    { key: "until", label: "Until (YYYY-MM-DD)", type: "date" },
    organizationIdParam,
  ],
  output: [
    { key: "interval", type: "string", label: "Interval used" },
    { key: "since", type: "string", label: "Range start" },
    { key: "until", type: "string", label: "Range end" },
    { key: "totals", type: "object", label: "Totals across the whole range" },
    { key: "data", type: "array", label: "Per-bucket breakdown" },
  ],

  execute(input, ctx) {
    return new VideoAskClient(ctx).entity(`/forms/${encodeId(input.formId)}/metrics`, {
      query: { interval: input.interval ?? "weekly", since: input.since, until: input.until },
      organizationId: input.organizationId,
    });
  },
};

export default formMetricsGet;
