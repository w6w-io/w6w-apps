import type { ActionDefinition } from "@w6w/types";
import { encodeId, HoldedClient } from "../lib/client.ts";

/** `GET /leads/{leadId}` — one lead, with its notes, tasks and attached files inline. */
interface Input {
  leadId: string;
}

const leadGet: ActionDefinition<Input> = {
  key: "lead-get",
  type: "read",
  resource: "lead",
  title: "Get Lead",
  description: "Fetch one lead by id.",
  params: [
    {
      key: "leadId",
      label: "Lead ID",
      type: "string",
      required: true,
      hint: "From the `id` of a List Leads result.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Lead ID" },
    { key: "funnelId", type: "string", label: "Funnel this lead belongs to" },
    { key: "stageId", type: "string", label: "Current stage" },
    { key: "contactId", type: "string", label: "Linked contact ID" },
    { key: "contactName", type: "string", label: "Contact name" },
    { key: "name", type: "string", label: "Lead name" },
    { key: "value", type: "number", label: "Monetary value" },
    { key: "potential", type: "number", label: "Win potential" },
    { key: "dueDate", type: "number", label: "Due date, Unix timestamp" },
    { key: "createdAt", type: "number", label: "Created at, Unix timestamp" },
    { key: "updatedAt", type: "number", label: "Updated at, Unix timestamp" },
    { key: "status", type: "number", label: "Lead status" },
    { key: "customFields", type: "array", label: "Custom field values" },
    { key: "events", type: "array", label: "Notes and calendar events on this lead" },
    { key: "tasks", type: "array", label: "Tasks on this lead" },
    { key: "files", type: "array", label: "Attached file names" },
  ],

  execute(input, ctx) {
    return new HoldedClient(ctx).get<Record<string, unknown>>(`/leads/${encodeId(input.leadId)}`);
  },
};

export default leadGet;
