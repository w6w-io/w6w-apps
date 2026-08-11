import { assertEquals, assertRejects } from "@std/assert";
import itemGetByExternalId from "../../actions/item-get-by-external-id.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("item-get-by-external-id: builds the documented path", async () => {
  const { ctx, calls } = mockCtx([{ body: { item_id: 9, external_id: "crm-88" } }]);
  const out = await itemGetByExternalId.execute({ appId: "123", externalId: "crm-88" }, ctx);
  assertEquals(out, { item: { item_id: 9, external_id: "crm-88" } });
  assertEquals(pathOf(calls[0].url), "/item/app/123/external_id/crm-88");
});

/**
 * An external id is a string chosen by whoever imported the data, so it is the
 * one path segment in this app that can carry anything at all.
 */
Deno.test("item-get-by-external-id: an external id cannot rewrite the request path", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await itemGetByExternalId.execute({ appId: "123", externalId: "a/b?c=d" }, ctx);
  assertEquals(pathOf(calls[0].url), "/item/app/123/external_id/a%2Fb%3Fc%3Dd");
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("item-get-by-external-id: strips the push signature", async () => {
  const { ctx } = mockCtx([{ body: { item_id: 9, push: { signature: "s" } } }]);
  const out = await itemGetByExternalId.execute({ appId: "1", externalId: "x" }, ctx) as {
    item: Record<string, unknown>;
  };
  assertEquals(out.item.push, undefined);
});

Deno.test("item-get-by-external-id: a miss is Podio's 404, surfaced as an error", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { error: "not_found", error_description: "No item found" },
  }]);
  const error = await assertRejects(
    () => Promise.resolve(itemGetByExternalId.execute({ appId: "1", externalId: "nope" }, ctx)),
    Error,
  );
  assertEquals(error.message.includes("404"), true);
  assertEquals(error.message.includes("not_found"), true);
});
