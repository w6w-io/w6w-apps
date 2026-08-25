import type { ActionDefinition } from "@w6w/types";
import { deskGet, type DeskGetInput } from "../lib/desk.ts";
import { orgId, recordId } from "../lib/params.ts";

interface Input extends DeskGetInput {
  include?: string;
}

const agentGet: ActionDefinition<Input, Record<string, unknown>> = {
  key: "agent-get",
  type: "read",
  resource: "agent",
  title: "Get Agent",
  description: "Get a single agent by id.",
  params: [
    recordId,
    orgId,
    {
      key: "include",
      label: "Include",
      type: "string",
      hint: "Comma-separated: profile, role, associatedDepartments, associatedChatDepartments, " +
        "verifiedEmails.",
    },
  ],
  output: [{ key: "id", type: "string", label: "Agent ID" }],

  execute(input, ctx) {
    return deskGet(ctx, "/agents", input, { include: input.include });
  },
};

export default agentGet;
