import type { ActionDefinition } from "@w6w/types";
import { compact, SellClient, toList } from "../lib/client.ts";
import { tagsParam } from "../lib/params.ts";

interface Input {
  id: number;
  content?: string;
  isImportant?: boolean;
  type?: string;
  tags?: string;
}

const noteUpdate: ActionDefinition<Input> = {
  key: "note-update",
  type: "perform",
  resource: "note",
  title: "Update Note",
  description: "Update an existing note.",
  idempotent: true,
  params: [
    { key: "id", label: "Note ID", type: "number", required: true },
    { key: "content", label: "Content", type: "text" },
    { key: "isImportant", label: "Starred / important", type: "boolean" },
    {
      key: "type",
      label: "Visibility",
      type: "select",
      options: [
        { value: "regular", label: "Regular" },
        { value: "restricted", label: "Restricted to the note's creator" },
      ],
    },
    tagsParam,
  ],
  output: [
    { key: "id", type: "number", label: "Note ID" },
  ],

  async execute(input, ctx) {
    const data = {
      ...compact({
        content: input.content,
        is_important: input.isImportant,
        type: input.type,
      }),
      tags: toList(input.tags),
    };
    return await new SellClient(ctx).update(`/notes/${encodeURIComponent(String(input.id))}`, data);
  },
};

export default noteUpdate;
