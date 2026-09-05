import type { ActionDefinition } from "@w6w/types";
import { AffinityClient, type SuccessBody } from "../lib/client.ts";
import { noteIdPathParam } from "../lib/params.ts";

/** `DELETE /notes/{note_id}`. */
interface Input {
  noteId: number;
}

const notesDelete: ActionDefinition<Input> = {
  key: "notes-delete",
  type: "perform",
  resource: "note",
  title: "Delete Note",
  description: "Delete a note.",
  idempotent: true,
  params: [noteIdPathParam],
  output: [{ key: "success", type: "boolean", label: "Success" }],

  execute(input, ctx): Promise<SuccessBody> {
    return new AffinityClient(ctx).delete(`/notes/${input.noteId}`);
  },
};

export default notesDelete;
