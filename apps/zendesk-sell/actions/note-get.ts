import type { ActionDefinition } from "@w6w/types";
import { SellClient } from "../lib/client.ts";

interface Input {
  id: number;
}

const noteGet: ActionDefinition<Input> = {
  key: "note-get",
  type: "read",
  resource: "note",
  title: "Get Note",
  description: "Retrieve a single note by ID.",
  params: [
    { key: "id", label: "Note ID", type: "number", required: true },
  ],
  output: [
    { key: "id", type: "number", label: "Note ID" },
    { key: "content", type: "string", label: "Content" },
  ],

  async execute(input, ctx) {
    return await new SellClient(ctx).get(`/notes/${encodeURIComponent(String(input.id))}`);
  },
};

export default noteGet;
