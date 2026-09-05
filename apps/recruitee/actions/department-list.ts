import type { ActionDefinition } from "@w6w/types";
import { RecruiteeClient } from "../lib/client.ts";

/** `GET /c/{company_id}/departments` — "List company departments". No documented filters. */
type Input = Record<string, never>;

const departmentList: ActionDefinition<Input> = {
  key: "department-list",
  type: "search",
  resource: "department",
  title: "List Departments",
  description: "List the company's departments.",
  params: [],
  output: [{ key: "departments", type: "array", label: "Departments" }],

  execute(_input, ctx) {
    return new RecruiteeClient(ctx).request("/departments");
  },
};

export default departmentList;
