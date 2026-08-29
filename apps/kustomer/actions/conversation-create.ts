import type { ActionDefinition } from "@w6w/types";
import { compact, csv, KustomerClient, unset } from "../lib/client.ts";
import { recordOutput } from "../lib/params.ts";

interface Input {
  customer: string;
  name?: string;
  priority?: number;
  externalId?: string;
  assignedUsers?: string;
  assignedTeams?: string;
}

/**
 * `POST /v1/conversations` — verified against `CreateaConversationRequest`
 * in the Core Resources OAS. `customer` (a Kustomer customer ID) is the only
 * required field.
 */
const conversationCreate: ActionDefinition<Input> = {
  key: "conversation-create",
  type: "perform",
  resource: "conversation",
  title: "Create Conversation",
  description: "Open a conversation for a customer.",
  idempotent: false,
  params: [
    {
      key: "customer",
      label: "Customer ID",
      type: "string",
      required: true,
      hint: "Use Get Customer / Find Customer by Email first if you only have contact details.",
    },
    { key: "name", label: "Name", type: "string" },
    {
      key: "priority",
      label: "Priority",
      type: "number",
      hint: "1 (highest) to 5 (lowest).",
      validation: { min: 1, max: 5, integer: true },
    },
    { key: "externalId", label: "External ID", type: "string" },
    {
      key: "assignedUsers",
      label: "Assigned user IDs",
      type: "string",
      advanced: true,
      hint: "Comma-separated.",
    },
    {
      key: "assignedTeams",
      label: "Assigned team IDs",
      type: "string",
      advanced: true,
      hint: "Comma-separated.",
    },
  ],
  output: recordOutput,

  execute(input, ctx) {
    return new KustomerClient(ctx).data("/conversations", {
      method: "POST",
      body: compact({
        customer: input.customer,
        name: unset(input.name),
        priority: input.priority,
        externalId: unset(input.externalId),
        assignedUsers: csv(input.assignedUsers),
        assignedTeams: csv(input.assignedTeams),
      }),
    });
  },
};

export default conversationCreate;
