import type { ActionDefinition } from "@w6w/types";
import { deskList, type DeskListEnvelope, type DeskListInput } from "../lib/desk.ts";
import { orgId, pageParams } from "../lib/params.ts";

interface Input extends DeskListInput {
  isEnabled?: boolean;
  searchStr?: string;
}

const departmentList: ActionDefinition<Input, DeskListEnvelope<Record<string, unknown>>> = {
  key: "department-list",
  type: "read",
  resource: "department",
  title: "List Departments",
  description: "List departments, with pagination support.",
  params: [
    orgId,
    { key: "isEnabled", label: "Enabled only", type: "boolean" },
    {
      key: "searchStr",
      label: "Search text",
      type: "string",
      hint: "Matches department name, help center name, or description.",
    },
    ...pageParams,
  ],
  output: [{ key: "data", type: "array", label: "Departments" }],

  execute(input, ctx) {
    return deskList(ctx, "/departments", input, {
      isEnabled: input.isEnabled,
      searchStr: input.searchStr,
    });
  },
};

export default departmentList;
