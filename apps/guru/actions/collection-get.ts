import type { ActionDefinition } from "@w6w/types";
import { GuruClient, stripTokens } from "../lib/client.ts";
import { collectionIdParam } from "../lib/params.ts";

/** `GET /api/v1/collections/{collectionId}` — one Collection by ID. */
interface Input {
  collectionId: string;
}

const collectionGet: ActionDefinition<Input> = {
  key: "collection-get",
  type: "read",
  resource: "collection",
  title: "Get Collection",
  description: "Fetch one Collection by ID.",
  params: [collectionIdParam],
  output: [{ key: "data", type: "object", label: "The Collection" }],

  async execute(input, ctx) {
    const collection = await new GuruClient(ctx).json<Record<string, unknown>>(
      `/collections/${encodeURIComponent(input.collectionId)}`,
    );
    return stripTokens(collection);
  },
};

export default collectionGet;
