import { assert, assertEquals } from "@std/assert";
import collectionGet from "../../actions/collection-get.ts";
import { item, mockCtx, pathOf } from "../_helpers.ts";

/**
 * Singular. `/collections/{id}` is the list route and would not answer this
 * question — the pluralisation is the single most common way to write a broken
 * Raindrop request.
 */
Deno.test("collection-get: reads the SINGULAR collection path", async () => {
  const { ctx, calls } = mockCtx([{ body: item({ _id: 8492393, title: "Development" }) }]);
  const out = await collectionGet.execute({ id: 8492393 }, ctx) as { item: unknown };

  assertEquals(pathOf(calls[0].url), "/rest/v1/collection/8492393");
  assert(!pathOf(calls[0].url).startsWith("/rest/v1/collections"), "used the plural list route");
  assertEquals(out.item, { _id: 8492393, title: "Development" });
});

Deno.test("collection-get: a system collection id survives the path build", async () => {
  const { ctx, calls } = mockCtx([{ body: item({ _id: -99 }) }]);
  await collectionGet.execute({ id: -99 }, ctx);
  assertEquals(pathOf(calls[0].url), "/rest/v1/collection/-99");
});
