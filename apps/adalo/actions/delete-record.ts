import type { ActionDefinition } from "@w6w/types";
import { AdaloClient, appIdFromConnection } from "../lib/client.ts";

interface Input {
  collectionId: string;
  recordId: string;
}

/**
 * `DELETE /v0/apps/{appId}/collections/{collectionId}/{recordId}` — delete a
 * record. The vendor docs don't specify the success body shape, so this
 * action normalizes any non-error response to `{ success: true }` rather
 * than guessing at fields that may not exist.
 */
const deleteRecord: ActionDefinition<Input, { success: true }> = {
  key: "delete-record",
  type: "perform",
  resource: "record",
  title: "Delete Record",
  description: "Delete a record from an Adalo Collection.",
  idempotent: true,
  params: [
    { key: "collectionId", label: "Collection ID", type: "string", required: true },
    { key: "recordId", label: "Record ID", type: "string", required: true },
  ],
  output: [
    { key: "success", type: "boolean", label: "Success" },
  ],

  async execute(input, ctx) {
    const client = new AdaloClient(ctx, appIdFromConnection(ctx.connection));
    await client.request(
      `/collections/${encodeURIComponent(input.collectionId)}/${
        encodeURIComponent(input.recordId)
      }`,
      { method: "DELETE" },
    );
    return { success: true };
  },
};

export default deleteRecord;
