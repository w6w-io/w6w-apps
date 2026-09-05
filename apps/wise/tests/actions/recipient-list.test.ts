import { assertEquals } from "@std/assert";
import recipientList from "../../actions/recipient-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const PAGE = {
  content: [{ id: 1, currency: "GBP" }],
  seekPositionForNext: 2,
  seekPositionForCurrent: 0,
  size: 20,
};

Deno.test("recipient-list: GETs /accounts and unwraps the paged envelope's content as items", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  const out = await recipientList.execute({}, ctx) as {
    items: unknown[];
    seekPositionForNext?: number;
  };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/2026Q3/accounts");
  assertEquals(out.items, [{ id: 1, currency: "GBP" }]);
  assertEquals(out.seekPositionForNext, 2);
});

Deno.test("recipient-list: passes filters and the seek cursor through as query params", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await recipientList.execute({ currency: "USD", active: false, seekPosition: 7, size: 5 }, ctx);
  assertEquals(queryOf(calls[0].url), {
    currency: "USD",
    active: "false",
    seekPosition: "7",
    size: "5",
  });
});

Deno.test("recipient-list: an empty content array wraps to an empty items array", async () => {
  const { ctx } = mockCtx([{ body: { content: [] } }]);
  const out = await recipientList.execute({}, ctx) as { items: unknown[] };
  assertEquals(out.items, []);
});
