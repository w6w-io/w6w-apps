import { assert, assertEquals } from "@std/assert";
import keyValueStoreList from "../../actions/key-value-store-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("key-value-store-list: calls GET /v2/key-value-stores", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([{ id: "s1", name: "config" }]) }]);
  const out = await keyValueStoreList.execute({ limit: 100 }, ctx) as { items: unknown[] };

  assertEquals(pathOf(calls[0].url), "/v2/key-value-stores");
  assertEquals(out.items, [{ id: "s1", name: "config" }]);
});

Deno.test("key-value-store-list: unnamed stores are excluded unless asked for", async () => {
  const { ctx, calls } = mockCtx([{ body: listEnvelope([]) }, { body: listEnvelope([]) }]);
  await keyValueStoreList.execute({}, ctx);
  assert(!("unnamed" in queryOf(calls[0].url)));

  await keyValueStoreList.execute({ unnamed: true }, ctx);
  assertEquals(queryOf(calls[1].url).unnamed, "1");
});

Deno.test("key-value-store-list: a signing key in a list item would still be stripped", async () => {
  const { ctx } = mockCtx([
    { body: listEnvelope([{ id: "s1", urlSigningSecretKey: "hmac-key-do-not-leak" }]) },
  ]);
  const out = await keyValueStoreList.execute({}, ctx) as { items: Array<Record<string, unknown>> };
  assertEquals("urlSigningSecretKey" in out.items[0], false);
  assert(!JSON.stringify(out).includes("hmac-key-do-not-leak"));
});
