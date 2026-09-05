import type { ActionDefinition } from "@w6w/types";
import { AffinityClient } from "../lib/client.ts";
import { noteIdPathParam } from "../lib/params.ts";

/**
 * `PUT /notes/{note_id}` — only `content` can be changed. The docs note you
 * cannot update the content of a note that has @ mentions, a note associated
 * with an email, or a note's `type`.
 */
interface Input {
  noteId: number;
  content: string;
}

const notesUpdate: ActionDefinition<Input> = {
  key: "notes-update",
  type: "perform",
  resource: "note",
  title: "Update Note",
  description:
    "Update a note's content. Cannot update a note with @ mentions, one created from an email, " +
    "or a note's type.",
  idempotent: false,
  params: [noteIdPathParam, { key: "content", label: "Content", type: "text", required: true }],
  output: [{ key: "id", type: "number", label: "Note ID" }],

  execute(input, ctx) {
    return new AffinityClient(ctx).json(`/notes/${input.noteId}`, {
      method: "PUT",
      body: { content: input.content },
    });
  },
};

export default notesUpdate;
