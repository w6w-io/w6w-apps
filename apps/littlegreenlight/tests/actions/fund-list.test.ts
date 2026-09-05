import { assertEquals } from "@std/assert";
import fundList from "../../actions/fund-list.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("fund-list: hits /api/v1/funds.json", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ id: 1, name: "General fund" }]) }]);
  const out = await fundList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/funds.json");
  assertEquals((out as { items: unknown[] }).items.length, 1);
});

Deno.test("fund-list: pagination is passed through", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  await fundList.execute({ limit: 5, offset: 10 }, ctx);
  assertEquals(queryOf(calls[0].url), { limit: "5", offset: "10" });
});
