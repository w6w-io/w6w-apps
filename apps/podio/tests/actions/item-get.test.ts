import { assert, assertEquals } from "@std/assert";
import itemGet from "../../actions/item-get.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

/** An item shaped exactly as `GET /item/{item_id}` documents it. */
const ITEM = {
  item_id: 9,
  app: { app_id: 123, name: "Leads" },
  external_id: "crm-88",
  title: "Acme Ltd",
  push: { channel: "/item/9", signature: "sig", timestamp: 1 },
  fields: [
    {
      field_id: 1,
      type: "text",
      external_id: "title",
      config: { label: "Title" },
      values: [{ value: "Acme Ltd", format: "plain" }],
    },
    {
      field_id: 4,
      type: "date",
      external_id: "when",
      config: { label: "When" },
      values: [{ start_date: "2026-01-01", start_time: "09:00:00", end_date: "2026-01-02" }],
    },
  ],
};

Deno.test("item-get: GETs the item, sending no mark_as_viewed unless asked", async () => {
  const { ctx, calls } = mockCtx([{ body: ITEM }]);
  await itemGet.execute({ itemId: "9" }, ctx);
  assertEquals(pathOf(calls[0].url), "/item/9");
  assertEquals(queryOf(calls[0].url), {});
});

/**
 * Podio's default for this parameter is TRUE, so a read clears a human's unread
 * notifications. A polling workflow needs to be able to turn that off, which
 * means `false` has to survive as a value rather than collapsing into absence.
 */
Deno.test("item-get: mark_as_viewed=false is expressible, because Podio defaults it to true", async () => {
  const off = mockCtx([{ body: ITEM }]);
  await itemGet.execute({ itemId: "9", markAsViewed: false }, off.ctx);
  assertEquals(queryOf(off.calls[0].url), { mark_as_viewed: "false" });

  const on = mockCtx([{ body: ITEM }]);
  await itemGet.execute({ itemId: "9", markAsViewed: true }, on.ctx);
  assertEquals(queryOf(on.calls[0].url), { mark_as_viewed: "true" });
});

/**
 * The design decision this whole app is organised around: field values keep
 * Podio's sub_id structure. Flattening a date field to one scalar would drop
 * the end date silently.
 */
Deno.test("item-get: field values keep every sub_id, unflattened", async () => {
  const { ctx } = mockCtx([{ body: ITEM }]);
  const out = await itemGet.execute({ itemId: "9" }, ctx) as { item: Record<string, unknown> };
  const fields = out.item.fields as Array<Record<string, unknown>>;
  assertEquals(fields.length, 2);
  assertEquals(fields[1].values, [{
    start_date: "2026-01-01",
    start_time: "09:00:00",
    end_date: "2026-01-02",
  }]);
  assert(Array.isArray(out.item.fields), "fields was collapsed into a map");
});

Deno.test("item-get: the push channel signature is stripped", async () => {
  const { ctx } = mockCtx([{ body: ITEM }]);
  const out = await itemGet.execute({ itemId: "9" }, ctx) as { item: Record<string, unknown> };
  assertEquals(out.item.push, undefined);
  assertEquals(out.item.item_id, 9);
});

Deno.test("item-get: an item id is path-escaped", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await itemGet.execute({ itemId: "9/../1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/item/9%2F..%2F1");
});
