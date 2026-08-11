import type { ActionDefinition } from "@w6w/types";
import { ApifyClient, encodeId, stripSecrets } from "../lib/client.ts";
import { storeIdParam } from "../lib/params.ts";

/**
 * `GET /v2/key-value-stores/{storeId}` — one store's metadata.
 *
 * ## One field is removed from the response
 *
 * The `KeyValueStore` schema carries **`urlSigningSecretKey`**, the HMAC key
 * that mints signed public URLs for this store's records. It is a live
 * credential and it is deleted before this action returns, for the same reason
 * as in Get Dataset: an action result is persisted and echoed, and a signing key
 * in it is a durable leak.
 *
 * `keysPublicUrl` and `recordsPublicUrl` are kept — they are plain URLs whose
 * usefulness depends on the store's `generalAccess`, and they carry no secret of
 * their own.
 */
interface Input {
  storeId: string;
}

const keyValueStoreGet: ActionDefinition<Input> = {
  key: "key-value-store-get",
  type: "read",
  resource: "key-value-store",
  title: "Get Key-Value Store",
  description:
    "Fetch one key-value store's metadata. The URL-signing secret is removed from the response.",
  params: [storeIdParam],
  output: [
    { key: "id", type: "string", label: "Store ID" },
    { key: "name", type: "string", label: "Name — absent for a run's own store" },
    { key: "generalAccess", type: "string", label: "Whether the store is publicly readable" },
    { key: "stats", type: "object", label: "Storage statistics" },
  ],

  async execute(input, ctx) {
    const store = await new ApifyClient(ctx).data<Record<string, unknown>>(
      `/key-value-stores/${encodeId(input.storeId)}`,
    );
    return stripSecrets(store);
  },
};

export default keyValueStoreGet;
