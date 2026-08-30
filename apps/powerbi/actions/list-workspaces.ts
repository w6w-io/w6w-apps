import type { ActionDefinition } from "@w6w/types";
import { PowerBIClient } from "../lib/client.ts";
import { listOutput, pagingParams } from "../lib/params.ts";

interface Input {
  filter?: string;
  top?: number;
  skip?: number;
}

interface Workspace {
  id: string;
  name?: string;
  isReadOnly?: boolean;
  isOnDedicatedCapacity?: boolean;
  capacityId?: string;
  [k: string]: unknown;
}

interface Output {
  value: Workspace[];
}

/**
 * `GET /groups` — `?$filter={$filter}&$top={$top}&$skip={$skip}`
 * https://learn.microsoft.com/en-us/rest/api/power-bi/groups/get-groups
 *
 * Returns every workspace the caller has access to. Power BI's own docs call
 * this resource a "group" internally; every reference page and this action
 * call it a workspace, which is what a user sees in the product.
 *
 * Required scope: `Workspace.Read.All` or `Workspace.ReadWrite.All`.
 */
const listWorkspaces: ActionDefinition<Input, Output> = {
  key: "list-workspaces",
  type: "read",
  resource: "workspace",
  title: "List Workspaces",
  description: "List the workspaces the connected account has access to.",
  params: [
    {
      key: "filter",
      label: "Filter",
      type: "string",
      advanced: true,
      placeholder: "contains(name,'marketing')",
      hint: "OData `$filter` — narrow the result set by an expression over workspace properties.",
    },
    ...pagingParams(),
  ],
  output: listOutput("Workspaces"),

  async execute(input, ctx) {
    const client = new PowerBIClient(ctx);
    const value = await client.list<Workspace>("/groups", {
      query: { $filter: input.filter, $top: input.top, $skip: input.skip },
    });
    return { value };
  },
};

export default listWorkspaces;
