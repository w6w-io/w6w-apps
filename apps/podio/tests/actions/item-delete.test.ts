import { assert, assertEquals } from "@std/assert";
import itemDelete from "../../actions/item-delete.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("item-delete: DELETEs the item and reports the status", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  assertEquals(await itemDelete.execute({ itemId: "9" }, ctx), { status: 204 });
  assertEquals(pathOf(calls[0].url), "/item/9");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(queryOf(calls[0].url), {});
});

Deno.test("item-delete: the webhook and stream switches reach the query string", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  await itemDelete.execute({ itemId: "9", hook: false, silent: true }, ctx);
  assertEquals(queryOf(calls[0].url), { hook: "false", silent: "true" });
});

/** Podio publishes no restore endpoint for an item, so the log line is the record. */
Deno.test("item-delete: warns before an irreversible write", async () => {
  const { ctx, logs } = mockCtx([{ status: 204 }]);
  await itemDelete.execute({ itemId: "9" }, ctx);
  assertEquals(logs.length, 1);
  assertEquals(logs[0].level, "warn");
  assert(logs[0].message.includes("permanently"));
  assertEquals(logs[0].data, { itemId: "9" });
});

Deno.test("item-delete: is declared idempotent — the end state converges", () => {
  assertEquals(itemDelete.idempotent, true);
  assertEquals(itemDelete.type, "perform");
});
