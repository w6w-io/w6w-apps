import type { ActionDefinition } from "@w6w/types";
import { deskGet, type DeskGetInput } from "../lib/desk.ts";
import { orgId, recordId } from "../lib/params.ts";

const departmentGet: ActionDefinition<DeskGetInput, Record<string, unknown>> = {
  key: "department-get",
  type: "read",
  resource: "department",
  title: "Get Department",
  description: "Get a single department by id.",
  params: [recordId, orgId],
  output: [{ key: "id", type: "string", label: "Department ID" }],

  execute(input, ctx) {
    return deskGet(ctx, "/departments", input);
  },
};

export default departmentGet;
