import type { ActionDefinition } from "@w6w/types";
import { deskList, type DeskListEnvelope, type DeskListInput } from "../lib/desk.ts";
import { orgId, pageParams } from "../lib/params.ts";

interface Input extends DeskListInput {
  include?: string;
  sortBy?: string;
}

const contactList: ActionDefinition<Input, DeskListEnvelope<Record<string, unknown>>> = {
  key: "contact-list",
  type: "read",
  resource: "contact",
  title: "List Contacts",
  description:
    "List contacts, with pagination support. Use `search-records` for a text search instead.",
  params: [
    orgId,
    { key: "include", label: "Include", type: "string", hint: "Supported value: accounts." },
    {
      key: "sortBy",
      label: "Sort by",
      type: "string",
      hint: "firstName, lastName, or createdTime. Prefix with - for descending.",
    },
    ...pageParams,
  ],
  output: [{ key: "data", type: "array", label: "Contacts" }],

  execute(input, ctx) {
    return deskList(ctx, "/contacts", input, { include: input.include, sortBy: input.sortBy });
  },
};

export default contactList;
