import type { ActionDefinition } from "@w6w/types";
import { entityPath, JibbleClient, WORKSPACE_HOST } from "../lib/client.ts";

/** `GET /v1/People(id)` — one member's full record. */
interface Input {
  personId: string;
  select?: string;
  expand?: string;
}

const memberGet: ActionDefinition<Input> = {
  key: "member-get",
  type: "read",
  resource: "member",
  title: "Get Member",
  description: "Get one member by id.",
  params: [
    { key: "personId", label: "Person ID", type: "string", required: true },
    {
      key: "select",
      label: "Fields to return ($select)",
      type: "string",
      advanced: true,
      hint: "Comma-separated field names, e.g. id,fullName,email.",
    },
    {
      key: "expand",
      label: "Expand ($expand)",
      type: "string",
      advanced: true,
      hint: "Comma-separated nested objects to inline, e.g. group($select=id,name).",
    },
  ],
  output: [{ key: "id", type: "string", label: "Person ID" }],

  async execute(input, ctx) {
    if (!input.personId) throw new Error("personId is required");
    return await new JibbleClient(ctx).json(
      WORKSPACE_HOST,
      entityPath("People", input.personId),
      { query: { "$select": input.select, "$expand": input.expand } },
    );
  },
};

export default memberGet;
