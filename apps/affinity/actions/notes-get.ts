import type { ActionDefinition } from "@w6w/types";
import { AffinityClient } from "../lib/client.ts";
import { noteIdPathParam } from "../lib/params.ts";

/** `GET /notes/{note_id}`. */
interface Input {
  noteId: number;
}

const notesGet: ActionDefinition<Input> = {
  key: "notes-get",
  type: "read",
  resource: "note",
  title: "Get Note",
  description: "Fetch one note.",
  params: [noteIdPathParam],
  output: [{ key: "id", type: "number", label: "Note ID" }],

  execute(input, ctx) {
    return new AffinityClient(ctx).json(`/notes/${input.noteId}`);
  },
};

export default notesGet;
