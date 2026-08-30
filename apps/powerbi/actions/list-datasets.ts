import type { ActionDefinition } from "@w6w/types";
import { groupPath, PowerBIClient } from "../lib/client.ts";
import { groupIdParam, listOutput } from "../lib/params.ts";

interface Input {
  groupId?: string;
}

interface Output {
  value: unknown[];
}

/**
 * `GET [/groups/{groupId}]/datasets`
 * https://learn.microsoft.com/en-us/rest/api/power-bi/datasets/get-datasets ·
 * https://learn.microsoft.com/en-us/rest/api/power-bi/datasets/get-datasets-in-group
 *
 * Required scope: `Dataset.ReadWrite.All` or `Dataset.Read.All`.
 */
const listDatasets: ActionDefinition<Input, Output> = {
  key: "list-datasets",
  type: "read",
  resource: "dataset",
  title: "List Datasets",
  description: "List datasets in a workspace, or in My workspace when no workspace is given.",
  params: [groupIdParam],
  output: listOutput("Datasets"),

  async execute(input, ctx) {
    const client = new PowerBIClient(ctx);
    const value = await client.list(`${groupPath(input)}/datasets`);
    return { value };
  },
};

export default listDatasets;
