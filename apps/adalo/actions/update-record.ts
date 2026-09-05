import type { ActionDefinition } from "@w6w/types";
import { AdaloClient, appIdFromConnection } from "../lib/client.ts";

interface Input {
  collectionId: string;
  recordId: string;
  fields: Record<string, unknown>;
}

/**
 * `PUT /v0/apps/{appId}/collections/{collectionId}/{recordId}` — update a
 * record's fields. Applying the same `fields` twice leaves the record in the
 * same state, so this is safe to retry.
 */
const updateRecord: ActionDefinition<Input> = {
  key: "update-record",
  type: "perform",
  resource: "record",
  title: "Update Record",
  description: "Update fields on an existing record in an Adalo Collection.",
  idempotent: true,
  params: [
    { key: "collectionId", label: "Collection ID", type: "string", required: true },
    { key: "recordId", label: "Record ID", type: "string", required: true },
    {
      key: "fields",
      label: "Fields",
      type: "json",
      required: true,
      hint: "Object of field slug → new value.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "Record ID" },
  ],

  execute(input, ctx) {
    const client = new AdaloClient(ctx, appIdFromConnection(ctx.connection));
    return client.request(
      `/collections/${encodeURIComponent(input.collectionId)}/${
        encodeURIComponent(input.recordId)
      }`,
      { method: "PUT", body: input.fields },
    );
  },
};

export default updateRecord;
