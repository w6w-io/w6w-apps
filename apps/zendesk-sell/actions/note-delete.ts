import type { ActionDefinition } from "@w6w/types";
import { SellClient } from "../lib/client.ts";

interface Input {
  id: number;
}

const noteDelete: ActionDefinition<Input> = {
  key: "note-delete",
  type: "perform",
  resource: "note",
  title: "Delete Note",
  description: "Delete a note. Cannot be undone.",
  idempotent: true,
  params: [
    { key: "id", label: "Note ID", type: "number", required: true },
  ],
  output: [],

  async execute(input, ctx) {
    await new SellClient(ctx).remove(`/notes/${encodeURIComponent(String(input.id))}`);
    return {};
  },
};

export default noteDelete;
