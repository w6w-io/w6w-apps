import type { ActionDefinition } from "@w6w/types";
import { compact, csv, KustomerClient, unset } from "../lib/client.ts";
import { recordOutput } from "../lib/params.ts";

interface Input {
  id: string;
  name?: string;
  status?: string;
  priority?: number;
  assignedUsers?: string;
  assignedTeams?: string;
}

const statusOptions = [
  { value: "open", label: "Open" },
  { value: "snoozed", label: "Snoozed" },
  { value: "done", label: "Done" },
];

/**
 * `PATCH /v1/conversations/{id}` — "Update conversation attributes" per the
 * Core Resources OAS (`UpdateConversationAttributesRequest`), a partial
 * merge. Its request body is declared under the content type
 * `application/json-patch+json` in the OAS even though the payload itself is
 * a flat partial object rather than an RFC 6902 patch array — see
 * `lib/client.ts`'s `RequestOptions.contentType` note.
 */
const conversationUpdate: ActionDefinition<Input> = {
  key: "conversation-update",
  type: "perform",
  resource: "conversation",
  title: "Update Conversation",
  description: "Merge new attribute values into an existing conversation.",
  idempotent: true,
  params: [
    { key: "id", label: "Conversation ID", type: "string", required: true },
    { key: "name", label: "Name", type: "string" },
    { key: "status", label: "Status", type: "select", options: statusOptions },
    {
      key: "priority",
      label: "Priority",
      type: "number",
      hint: "1 (highest) to 5 (lowest).",
      validation: { min: 1, max: 5, integer: true },
    },
    {
      key: "assignedUsers",
      label: "Assigned user IDs",
      type: "string",
      advanced: true,
      hint: "Comma-separated. Replaces the current assignment list.",
    },
    {
      key: "assignedTeams",
      label: "Assigned team IDs",
      type: "string",
      advanced: true,
      hint: "Comma-separated. Replaces the current assignment list.",
    },
  ],
  output: recordOutput,

  execute(input, ctx) {
    return new KustomerClient(ctx).data(`/conversations/${encodeURIComponent(input.id)}`, {
      method: "PATCH",
      contentType: "application/json-patch+json",
      body: compact({
        name: unset(input.name),
        status: unset(input.status),
        priority: input.priority,
        assignedUsers: csv(input.assignedUsers),
        assignedTeams: csv(input.assignedTeams),
      }),
    });
  },
};

export default conversationUpdate;
