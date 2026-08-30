import type { ActionDefinition } from "@w6w/types";
import { groupPath, PowerBIClient } from "../lib/client.ts";
import { datasetOutput, groupIdParam } from "../lib/params.ts";

interface Input {
  groupId?: string;
  datasetId: string;
}

interface Output {
  id?: string;
  name?: string;
  configuredBy?: string;
  isRefreshable?: boolean;
  addRowsAPIEnabled?: boolean;
  [k: string]: unknown;
}

/**
 * `GET [/groups/{groupId}]/datasets/{datasetId}`
 * https://learn.microsoft.com/en-us/rest/api/power-bi/datasets/get-dataset ·
 * https://learn.microsoft.com/en-us/rest/api/power-bi/datasets/get-dataset-in-group
 *
 * Required scope: `Dataset.ReadWrite.All` or `Dataset.Read.All`.
 */
const getDataset: ActionDefinition<Input, Output> = {
  key: "get-dataset",
  type: "read",
  resource: "dataset",
  title: "Get Dataset",
  description: "Get a single dataset's metadata.",
  params: [
    groupIdParam,
    { key: "datasetId", label: "Dataset ID", type: "string", required: true },
  ],
  output: datasetOutput,

  async execute(input, ctx) {
    const client = new PowerBIClient(ctx);
    return await client.request<Output>(
      `${groupPath(input)}/datasets/${encodeURIComponent(input.datasetId)}`,
    );
  },
};

export default getDataset;
