import type { ActionDefinition } from "@w6w/types";
import { compact, LawmaticsClient, type LawmaticsItemEnvelope } from "../lib/client.ts";
import { ASSOCIATION_TYPES } from "../lib/params.ts";

interface Input {
  name: string;
  body: string;
  notableType: string;
  notableId: string;
}

/**
 * `POST /v1/notes` — create a Note attached to a Matter, Contact, Company or
 * Client. Confirmed against the collection's "Create Note" sample body:
 * `{name, body, notable_type, notable_id}`.
 */
const createNote: ActionDefinition<Input> = {
  key: "create-note",
  type: "perform",
  resource: "note",
  title: "Create Note",
  description: "Create a new Note attached to a Matter, Contact, Company or Client.",
  idempotent: false,
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    { key: "body", label: "Body", type: "text", required: true },
    {
      key: "notableType",
      label: "Associated Record Type",
      type: "select",
      options: ASSOCIATION_TYPES,
      required: true,
    },
    {
      key: "notableId",
      label: "Associated Record ID",
      type: "string",
      required: true,
      dependsOn: ["notableType"],
    },
  ],
  output: [
    { key: "id", type: "string", label: "Note ID" },
    { key: "type", type: "string", label: "Resource type" },
    { key: "attributes", type: "object", label: "Note attributes" },
  ],

  async execute(input, ctx) {
    const res = await new LawmaticsClient(ctx).request<LawmaticsItemEnvelope>("/notes", {
      method: "POST",
      body: compact({
        name: input.name,
        body: input.body,
        notable_type: input.notableType,
        notable_id: input.notableId,
      }),
    });
    return res.data;
  },
};

export default createNote;
