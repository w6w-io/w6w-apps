import type { ActionDefinition } from "@w6w/types";
import { AdaloClient, appIdFromConnection } from "../lib/client.ts";

interface Input {
  collectionId: string;
  recordId: string;
}

/** `GET /v0/apps/{appId}/collections/{collectionId}/{recordId}` — fetch one record. */
const getRecord: ActionDefinition<Input> = {
  key: "get-record",
  type: "read",
  resource: "record",
  title: "Get Record",
  description: "Fetch a single record from an Adalo Collection by its Record ID.",
  params: [
    { key: "collectionId", label: "Collection ID", type: "string", required: true },
    { key: "recordId", label: "Record ID", type: "string", required: true },
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
    );
  },
};

export default getRecord;
