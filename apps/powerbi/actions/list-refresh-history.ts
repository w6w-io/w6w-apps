import type { ActionDefinition } from "@w6w/types";
import { groupPath, PowerBIClient } from "../lib/client.ts";
import { groupIdParam, listOutput } from "../lib/params.ts";

interface Input {
  groupId?: string;
  datasetId: string;
  top?: number;
}

interface Output {
  value: unknown[];
}

/**
 * `GET [/groups/{groupId}]/datasets/{datasetId}/refreshes` — `?$top={$top}`
 * https://learn.microsoft.com/en-us/rest/api/power-bi/datasets/get-refresh-history ·
 * https://learn.microsoft.com/en-us/rest/api/power-bi/datasets/get-refresh-history-in-group
 *
 * Each entry carries `status` (`Completed`/`Failed`/`Disabled`/`Unknown`),
 * `startTime`/`endTime`, `refreshType` and, for a failure, `serviceExceptionJson`.
 *
 * Required scope: `Dataset.ReadWrite.All` or `Dataset.Read.All`.
 *
 * Limitations the reference states: OneDrive-backed refreshes aren't
 * returned; the service keeps 20–60 entries depending on age (entries older
 * than 3 days are pruned once there are more than 20).
 */
const listRefreshHistory: ActionDefinition<Input, Output> = {
  key: "list-refresh-history",
  type: "read",
  resource: "dataset",
  title: "List Refresh History",
  description: "List recent refresh attempts for a dataset.",
  params: [
    groupIdParam,
    { key: "datasetId", label: "Dataset ID", type: "string", required: true },
    {
      key: "top",
      label: "Max entries",
      type: "number",
      advanced: true,
      validation: { integer: true, min: 1 },
      hint: "Defaults to the last available 60 entries when left empty.",
    },
  ],
  output: listOutput("Refresh history entries"),

  async execute(input, ctx) {
    const client = new PowerBIClient(ctx);
    const value = await client.list(
      `${groupPath(input)}/datasets/${encodeURIComponent(input.datasetId)}/refreshes`,
      { query: { $top: input.top } },
    );
    return { value };
  },
};

export default listRefreshHistory;
