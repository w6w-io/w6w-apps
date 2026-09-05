import type { ActionDefinition } from "@w6w/types";
import { AdaloClient, appIdFromConnection } from "../lib/client.ts";

interface Input {
  collectionId: string;
  fields: Record<string, unknown>;
}

/**
 * `POST /v0/apps/{appId}/collections/{collectionId}` — create a record.
 * `fields` is the map of the Collection's own field slug → value; Adalo
 * defines no fixed schema (every app's Collections differ), so this stays a
 * free-form JSON object rather than a fixed field list.
 */
const createRecord: ActionDefinition<Input> = {
  key: "create-record",
  type: "perform",
  resource: "record",
  title: "Create Record",
  description: "Create a record in an Adalo Collection.",
  idempotent: false,
  params: [
    { key: "collectionId", label: "Collection ID", type: "string", required: true },
    {
      key: "fields",
      label: "Fields",
      type: "json",
      required: true,
      hint: 'Object of field slug → value, e.g. `{ "Name": "Ada", "Score": 10 }`.',
    },
  ],
  output: [
    { key: "id", type: "string", label: "Record ID" },
  ],

  execute(input, ctx) {
    const client = new AdaloClient(ctx, appIdFromConnection(ctx.connection));
    return client.request(`/collections/${encodeURIComponent(input.collectionId)}`, {
      method: "POST",
      body: input.fields,
    });
  },
};

export default createRecord;
