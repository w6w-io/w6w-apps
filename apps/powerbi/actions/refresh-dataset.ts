import type { ActionDefinition } from "@w6w/types";
import { compact, groupPath, PowerBIClient } from "../lib/client.ts";
import { groupIdParam } from "../lib/params.ts";

type NotifyOption = "NoNotification" | "MailOnFailure" | "MailOnCompletion";

interface Input {
  groupId?: string;
  datasetId: string;
  notifyOption: NotifyOption;
  options?: Record<string, unknown>;
}

interface Output {
  status: number;
  requestId?: string;
  location?: string;
}

/**
 * `POST [/groups/{groupId}]/datasets/{datasetId}/refreshes`
 * https://learn.microsoft.com/en-us/rest/api/power-bi/datasets/refresh-dataset ·
 * https://learn.microsoft.com/en-us/rest/api/power-bi/datasets/refresh-dataset-in-group
 *
 * Triggers a refresh. Returns `202 Accepted` with **no body** — the job id
 * isn't in the response at all, only in the `Location` header (and echoed in
 * `x-ms-request-id`); poll it with List Refresh History.
 *
 * `notifyOption` alone (the legacy shape) or one-or-more of the enhanced
 * refresh fields (`applyRefreshPolicy`, `commitMode`, `effectiveDate`,
 * `maxParallelism`, `objects`, `retryCount`, `timeout`, `type`) — but the
 * reference states these are mutually exclusive: an enhanced refresh must
 * *omit* `notifyOption` entirely, and Shared-capacity workspaces may only
 * ever send `notifyOption`. Rather than model eight enhanced-refresh fields
 * individually, this action always sends `notifyOption` (required, since a
 * Shared-capacity workspace needs it and this action has no way to know the
 * workspace's capacity tier) plus an optional raw JSON `options` object
 * merged in as the enhanced-refresh fields, for a Premium-capacity caller who
 * wants them — Power BI itself will reject the combination for a
 * Shared-capacity dataset with an error this action does not paper over.
 *
 * Required scope: `Dataset.ReadWrite.All` (no Read-only alternative).
 *
 * Limitation the reference states: Shared capacities allow at most 8
 * requests/day (scheduled refreshes count against the same limit).
 */
const refreshDataset: ActionDefinition<Input, Output> = {
  key: "refresh-dataset",
  type: "perform",
  resource: "dataset",
  title: "Refresh Dataset",
  description: "Trigger a data refresh for a dataset.",
  // Every call starts a new, independent refresh job — never a retry of a
  // prior one, and Power BI offers no client-supplied dedupe key here.
  idempotent: false,
  params: [
    groupIdParam,
    { key: "datasetId", label: "Dataset ID", type: "string", required: true },
    {
      key: "notifyOption",
      label: "Notify",
      type: "select",
      required: true,
      default: "NoNotification",
      options: [
        { value: "NoNotification", label: "No notification" },
        { value: "MailOnFailure", label: "Mail on failure" },
        { value: "MailOnCompletion", label: "Mail on success or failure" },
      ],
      hint:
        "Not applicable to an enhanced refresh (when Enhanced refresh options is set) or a service-principal call.",
    },
    {
      key: "options",
      label: "Enhanced refresh options",
      type: "json",
      advanced: true,
      hint:
        'Premium-capacity only. Raw fields merged alongside `notifyOption`, e.g. `{"type":"Full","objects":[{"table":"Sales"}]}`. See the Refresh Dataset reference for the full field list.',
    },
  ],
  output: [
    { key: "status", type: "number", label: "HTTP status" },
    { key: "requestId", type: "string", label: "Request ID" },
    { key: "location", type: "string", label: "Refresh job location URL" },
  ],

  async execute(input, ctx) {
    const client = new PowerBIClient(ctx);
    return await client.accepted(
      `${groupPath(input)}/datasets/${encodeURIComponent(input.datasetId)}/refreshes`,
      {
        method: "POST",
        body: compact({ notifyOption: input.notifyOption, ...(input.options ?? {}) }),
      },
    );
  },
};

export default refreshDataset;
