import type { ActionDefinition } from "@w6w/types";
import { compact, SellClient, toList } from "../lib/client.ts";
import { tagsParam } from "../lib/params.ts";

interface Input {
  resourceType: string;
  resourceId: number;
  content: string;
  isImportant?: boolean;
  type?: string;
  tags?: string;
}

const noteCreate: ActionDefinition<Input> = {
  key: "note-create",
  type: "perform",
  resource: "note",
  title: "Create Note",
  description: "Attach a note to a lead, contact or deal.",
  idempotent: false,
  params: [
    {
      key: "resourceType",
      label: "Attached to",
      type: "select",
      required: true,
      options: [
        { value: "lead", label: "Lead" },
        { value: "contact", label: "Contact" },
        { value: "deal", label: "Deal" },
      ],
    },
    { key: "resourceId", label: "Resource ID", type: "number", required: true },
    { key: "content", label: "Content", type: "text", required: true },
    { key: "isImportant", label: "Starred / important", type: "boolean" },
    {
      key: "type",
      label: "Visibility",
      type: "select",
      default: "regular",
      options: [
        { value: "regular", label: "Regular" },
        { value: "restricted", label: "Restricted to the note's creator" },
      ],
    },
    tagsParam,
  ],
  output: [
    { key: "id", type: "number", label: "New note ID" },
  ],

  async execute(input, ctx) {
    const data = {
      ...compact({
        resource_type: input.resourceType,
        resource_id: input.resourceId,
        content: input.content,
        is_important: input.isImportant,
        type: input.type,
      }),
      tags: toList(input.tags),
    };
    return await new SellClient(ctx).create("/notes", data, "note");
  },
};

export default noteCreate;
