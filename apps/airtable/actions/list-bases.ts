import type { ActionDefinition } from "@w6w/types";
import { AirtableClient, type AirtableListEnvelope } from "../lib/client.ts";

interface Input {
  offset?: string;
}

interface Base {
  id: string;
  name: string;
  permissionLevel: string;
}

/**
 * List bases accessible to the authenticated user via `GET /meta/bases`.
 * Same offset cursor as the record endpoints.
 */
const listBases: ActionDefinition<Input, AirtableListEnvelope<Base>> = {
  key: "list-bases",
  type: "read",
  resource: "base",
  title: "List Bases",
  description: "List Airtable bases accessible to the connected token.",
  params: [
    { key: "offset", label: "Offset cursor", type: "string" },
  ],
  output: [
    { key: "bases", type: "array", label: "Bases" },
    { key: "offset", type: "string", label: "Next page cursor" },
  ],

  async execute(input, ctx) {
    const client = new AirtableClient(ctx);
    return client.request<AirtableListEnvelope<Base>>("meta/bases", {
      query: { offset: input.offset },
    });
  },
};

export default listBases;
