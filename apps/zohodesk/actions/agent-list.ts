import type { ActionDefinition } from "@w6w/types";
import { deskList, type DeskListEnvelope, type DeskListInput } from "../lib/desk.ts";
import { orgId, pageParams } from "../lib/params.ts";

interface Input extends DeskListInput {
  status?: "ACTIVE" | "DISABLED" | "DELETED" | "IMPORTED";
  departmentIds?: string;
}

const agentList: ActionDefinition<Input, DeskListEnvelope<Record<string, unknown>>> = {
  key: "agent-list",
  type: "read",
  resource: "agent",
  title: "List Agents",
  description: "List agents, with pagination support.",
  params: [
    orgId,
    {
      key: "status",
      label: "Status",
      type: "select",
      options: [
        { value: "ACTIVE", label: "Active" },
        { value: "DISABLED", label: "Disabled" },
        { value: "DELETED", label: "Deleted" },
        { value: "IMPORTED", label: "Imported" },
      ],
    },
    { key: "departmentIds", label: "Department IDs", type: "string" },
    ...pageParams,
  ],
  output: [{ key: "data", type: "array", label: "Agents" }],

  execute(input, ctx) {
    return deskList(ctx, "/agents", input, {
      status: input.status,
      departmentIds: input.departmentIds,
    });
  },
};

export default agentList;
