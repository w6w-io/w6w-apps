import { assertEquals } from "@std/assert";
import transferList from "../../actions/transfer-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("transfer-list: GETs /transfers as a bare array, wrapped as items", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1 }, { id: 2 }] }]);
  const out = await transferList.execute({}, ctx) as { items: unknown[] };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/2026Q3/transfers");
  assertEquals(out.items.length, 2);
});

Deno.test("transfer-list: passes filters through as query params", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await transferList.execute({ status: "funds_converted", limit: 10, offset: 20 }, ctx);
  assertEquals(queryOf(calls[0].url), { status: "funds_converted", limit: "10", offset: "20" });
});
