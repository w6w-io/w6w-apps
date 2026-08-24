import type { ActionDefinition } from "@w6w/types";
import { compact, WealthboxClient } from "../lib/client.ts";

interface Input {
  content: string;
  linkedTo?: unknown[];
  visibleTo?: string;
  tags?: string[];
}

/**
 * `POST /v1/notes` — create a Note. `linkedTo` supports only Contact as its
 * resource type, per dev.wealthbox.com ("The only supported resource type is
 * contact").
 *
 * Not idempotent: Wealthbox mints a new note id per call with no idempotency
 * key on this endpoint, so a retry creates a duplicate.
 */
const createNote: ActionDefinition<Input> = {
  key: "create-note",
  type: "perform",
  resource: "note",
  title: "Create Note",
  description: "Create a Note, optionally linked to a Contact.",
  idempotent: false,
  params: [
    { key: "content", label: "Content", type: "text", required: true },
    {
      key: "linkedTo",
      label: "Linked to",
      type: "json",
      hint: 'Array of `{"id": 1, "type": "Contact"}` — Contact is the only supported type.',
    },
    {
      key: "visibleTo",
      label: "Visible to",
      type: "string",
      hint: '"Everyone", "Private", or a user-group id.',
    },
    { key: "tags", label: "Tags", type: "array", item: { type: "string" } },
  ],
  output: [{ key: "id", type: "number", label: "Note ID" }],

  execute(input, ctx) {
    const body = compact({
      content: input.content,
      linked_to: input.linkedTo,
      visible_to: input.visibleTo,
      tags: input.tags,
    });
    return new WealthboxClient(ctx).request("/notes", { method: "POST", body });
  },
};

export default createNote;
