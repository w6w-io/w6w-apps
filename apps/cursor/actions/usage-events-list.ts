import type { ActionDefinition } from "@w6w/types";
import { CursorClient } from "../lib/client.ts";
import { dateRangeParams } from "../lib/params.ts";

interface Input {
  startDate: number;
  endDate: number;
  userId?: number;
  email?: string;
  serviceAccountId?: string;
  cloudAgentId?: string;
  automationId?: string;
  hostingType?: string;
  page?: number;
  pageSize?: number;
}

/**
 * `POST /teams/filtered-usage-events` — granular, event-level usage: model
 * used, token counts, cost, and (when applicable) which service account,
 * cloud agent run, or automation produced it.
 *
 * Rate limited to 60 requests/minute per team. Data is aggregated hourly —
 * poll at most once per hour. All filters combine with AND.
 *
 * `startDate`/`endDate` are inclusive on both ends and read at millisecond
 * precision — for non-overlapping daily ingestion windows, set a window's
 * `endDate` to the previous day's final millisecond (`23:59:59.999`), not
 * midnight, or one millisecond of overlap or gap creeps in.
 *
 * `hostingType` isolates where a cloud-agent run executed: `CLOUD`
 * (Cursor-hosted), `SELF_HOSTED` (any self-hosted worker), `SELF_HOSTED_POOL`
 * (Team Pool only) or `SELF_HOSTED_MACHINE` (personal "My Machine" only). It
 * covers inference spend only — the vendor never meters the self-hosted
 * compute itself. An unrecognised value is a documented `400`, not an empty
 * result, so this app passes it through verbatim rather than validating it
 * client-side against a list that could go stale.
 *
 * To reconcile with `spend-get`'s totals, sum `chargedCents` (not
 * `tokenUsage.totalCents`, which omits the Cursor Token Rate fee).
 */
const usageEventsList: ActionDefinition<Input> = {
  key: "usage-events-list",
  type: "read",
  resource: "usage",
  title: "Get Usage Events Data",
  description:
    "Retrieve detailed, event-level usage: model, token consumption, and cost — with filtering " +
    "by user, service account, cloud agent run, automation, or hosting type.",
  params: [
    ...dateRangeParams(),
    {
      key: "userId",
      label: "User ID",
      type: "number",
      hint: "Numeric user id. Distinct from the encoded user_… id used elsewhere in this app.",
    },
    { key: "email", label: "Email", type: "string", hint: "Filter by user email address." },
    {
      key: "serviceAccountId",
      label: "Service account ID",
      type: "string",
    },
    {
      key: "cloudAgentId",
      label: "Cloud agent run ID",
      type: "string",
      hint: "Pass * to return events from all cloud agent runs.",
    },
    {
      key: "automationId",
      label: "Automation UUID",
      type: "string",
      hint: "Pass * to return events from all automations.",
    },
    {
      key: "hostingType",
      label: "Hosting type",
      type: "select",
      options: [
        { value: "CLOUD", label: "Cursor-hosted" },
        { value: "SELF_HOSTED", label: "Any self-hosted (pool or personal machine)" },
        { value: "SELF_HOSTED_POOL", label: "Team Pool workers only" },
        { value: "SELF_HOSTED_MACHINE", label: 'Personal "My Machine" workers only' },
      ],
      hint: "Filters cloud agent runs by where they executed. Covers inference spend only.",
    },
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 1,
      validation: { integer: true, min: 1 },
    },
    {
      key: "pageSize",
      label: "Page size",
      type: "number",
      default: 100,
      hint: "Maximum 1000.",
      validation: { integer: true, min: 1, max: 1000 },
    },
  ],
  output: [
    { key: "totalUsageEventsCount", type: "number", label: "Total matching events" },
    { key: "pagination", type: "object", label: "Pagination info" },
    { key: "usageEvents", type: "array", label: "Usage events" },
    { key: "period", type: "object", label: "Start and end of the requested range" },
  ],

  execute(input, ctx) {
    return new CursorClient(ctx).post("/teams/filtered-usage-events", {
      startDate: input.startDate,
      endDate: input.endDate,
      userId: input.userId,
      email: input.email,
      serviceAccountId: input.serviceAccountId,
      cloudAgentId: input.cloudAgentId,
      automationId: input.automationId,
      hostingType: input.hostingType,
      page: input.page,
      pageSize: input.pageSize,
    });
  },
};

export default usageEventsList;
