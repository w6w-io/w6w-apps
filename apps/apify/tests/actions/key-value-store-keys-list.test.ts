import { assertEquals } from "@std/assert";
import keyValueStoreKeysList from "../../actions/key-value-store-keys-list.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

/**
 * This is the only paginated endpoint in the whole API that does not use
 * `offset` — records have no numeric order, so it pages by `exclusiveStartKey`
 * in UTF-8 binary order and answers with `isTruncated` /
 * `nextExclusiveStartKey` instead of `total` / `count` / `offset`.
 */
Deno.test("key-value-store-keys-list: pages by key, not by offset", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: envelope({
        limit: 100,
        isTruncated: true,
        exclusiveStartKey: null,
        nextExclusiveStartKey: "page-2",
        items: [{ key: "OUTPUT", size: 12 }],
      }),
    },
  ]);
  const out = await keyValueStoreKeysList.execute(
    { storeId: "s1", exclusiveStartKey: "page-1", limit: 100 },
    ctx,
  ) as { isTruncated: boolean; nextExclusiveStartKey: string };

  assertEquals(pathOf(calls[0].url), "/v2/key-value-stores/s1/keys");
  assertEquals(queryOf(calls[0].url), { exclusiveStartKey: "page-1", limit: "100" });
  assertEquals(out.isTruncated, true);
  assertEquals(out.nextExclusiveStartKey, "page-2");
});

Deno.test("key-value-store-keys-list: does not offer an offset parameter", () => {
  assertEquals(keyValueStoreKeysList.params?.some((p) => p.key === "offset"), false);
});

Deno.test("key-value-store-keys-list: prefix and collection filters are passed through", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ items: [] }) }]);
  await keyValueStoreKeysList.execute(
    { storeId: "s1", prefix: "screenshot-", collection: "images" },
    ctx,
  );
  assertEquals(queryOf(calls[0].url).prefix, "screenshot-");
  assertEquals(queryOf(calls[0].url).collection, "images");
});
