import type { ActionDefinition } from "@w6w/types";
import { JibbleClient, WORKSPACE_HOST } from "../lib/client.ts";
import { odataListParams } from "../lib/params.ts";

/**
 * `GET /v1/Projects` — the organization's billable/trackable projects. Pass
 * `expand: "client($select=id,name),location($select=id,name)"` to inline the client and
 * location details, exactly as the collection's own "Check Projects with Client and Location
 * details" example does.
 */
interface Input {
  filter?: string;
  select?: string;
  expand?: string;
  orderBy?: string;
  top?: number;
  skip?: number;
  count?: boolean;
}

const projectList: ActionDefinition<Input> = {
  key: "project-list",
  type: "search",
  resource: "project",
  title: "List Projects",
  description: "List the organization's projects.",
  params: odataListParams(25),
  output: [
    { key: "items", type: "array", label: "Projects" },
    { key: "count", type: "number", label: "Total matching projects (only when Count is on)" },
  ],

  async execute(input, ctx) {
    return await new JibbleClient(ctx).list(WORKSPACE_HOST, "/v1/Projects", {
      filter: input.filter,
      select: input.select,
      expand: input.expand,
      orderBy: input.orderBy,
      top: input.top,
      skip: input.skip,
      count: input.count,
    });
  },
};

export default projectList;
