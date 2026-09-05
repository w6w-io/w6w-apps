import { assertEquals } from "@std/assert";
import accountList from "../../actions/account-list.ts";
import { entries, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("account-list: lists accounts with the ws.start/ws.size pagination pair", async () => {
  const { ctx, calls } = mockCtx([{ body: entries([{ id: 1 }, { id: 2 }]) }]);
  const out = await accountList.execute({ start: 0, size: 50 }, ctx) as { entries: unknown[] };

  assertEquals(pathOf(calls[0].url), "/1.0/accounts");
  assertEquals(queryOf(calls[0].url), { "ws.start": "0", "ws.size": "50" });
  assertEquals(out.entries.length, 2);
});

Deno.test("account-list: omits pagination params entirely when not given", async () => {
  const { ctx, calls } = mockCtx([{ body: entries([]) }]);
  await accountList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
