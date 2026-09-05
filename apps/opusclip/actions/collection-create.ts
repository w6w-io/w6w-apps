import type { ActionDefinition } from "@w6w/types";
import { OpusClipClient } from "../lib/client.ts";

/**
 * `POST /api/collections` — create a named collection of clips.
 *
 * The vendor documents a `402 QuotaExceed` response for this endpoint
 * specifically — collections are plan-limited — surfaced verbatim by
 * `formatOpusError` via the `errorName` it carries.
 *
 * Not idempotent: every call creates a new collection, even with a duplicate
 * name.
 */
interface Input {
  collectionName: string;
}

const collectionCreate: ActionDefinition<Input> = {
  key: "collection-create",
  type: "perform",
  resource: "collection",
  title: "Create Collection",
  description: "Create a named collection to group clips.",
  idempotent: false,
  params: [
    { key: "collectionName", label: "Collection name", type: "string", required: true },
  ],
  output: [
    { key: "collectionId", type: "string", label: "Collection ID" },
    { key: "collectionName", type: "string", label: "Name" },
    { key: "createdAt", type: "string", label: "Created at" },
  ],

  async execute(input, ctx) {
    return await new OpusClipClient(ctx).data("/api/collections", {
      method: "POST",
      body: { collectionName: input.collectionName },
    });
  },
};

export default collectionCreate;
