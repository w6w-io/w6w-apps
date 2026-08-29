import type { ActionDefinition } from "@w6w/types";
import { KustomerClient } from "../lib/client.ts";
import { listOutput, pagination } from "../lib/params.ts";

interface Input {
  page?: number;
  pageSize?: number;
  deleted?: boolean;
}

/** `GET /v1/teams` — verified against the Access Management OAS. */
const teamList: ActionDefinition<Input> = {
  key: "team-list",
  type: "read",
  resource: "team",
  title: "List Teams",
  description: "Page through the teams configured in your organization.",
  params: [
    { key: "deleted", label: "Include deleted", type: "boolean", default: false },
    ...pagination,
  ],
  output: listOutput,

  execute(input, ctx) {
    return new KustomerClient(ctx).json("/teams", {
      query: { page: input.page, pageSize: input.pageSize, deleted: input.deleted },
    });
  },
};

export default teamList;
