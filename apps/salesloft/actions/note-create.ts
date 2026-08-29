import type { ActionDefinition } from "@w6w/types";
import { compact, SalesloftClient } from "../lib/client.ts";

interface Input {
  content: string;
  associatedWithType: "person" | "account";
  associatedWithId: number;
  subject?: string;
  skipCrmSync?: boolean;
}

/**
 * POST /v2/notes — create a note associated with a person or account.
 * Confirmed against developers.salesloft.com/docs/api/notes-create.
 */
const noteCreate: ActionDefinition<Input> = {
  key: "note-create",
  type: "perform",
  resource: "note",
  title: "Create Note",
  description: "Create a note associated with a person or account.",
  idempotent: false,
  params: [
    { key: "content", label: "Content", type: "text", required: true },
    {
      key: "associatedWithType",
      label: "Associated with",
      type: "select",
      required: true,
      options: [{ value: "person", label: "Person" }, { value: "account", label: "Account" }],
    },
    { key: "associatedWithId", label: "Associated record ID", type: "number", required: true },
    {
      key: "subject",
      label: "Subject",
      type: "string",
      hint: "Defaults to 'Note' on the synced CRM activity.",
    },
    {
      key: "skipCrmSync",
      label: "Skip CRM sync",
      type: "boolean",
      advanced: true,
    },
  ],
  output: [{ key: "data", type: "object", label: "Note" }],

  async execute(input, ctx) {
    const client = new SalesloftClient(ctx);
    return await client.request("/notes", {
      method: "POST",
      body: compact({
        content: input.content,
        associated_with_type: input.associatedWithType,
        associated_with_id: input.associatedWithId,
        subject: input.subject,
        skip_crm_sync: input.skipCrmSync,
      }),
    });
  },
};

export default noteCreate;
