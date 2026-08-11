import { assertEquals } from "@std/assert";
import action from "../../actions/list-campaigns.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("list-campaigns: GETs /campaigns", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], paging: {} } }]);
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/campaigns");
  assertEquals(calls[0].method, "GET");
});

Deno.test("list-campaigns: forwards limit and cursor", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({ limit: 5, startingAfter: "cur" }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("limit"), "5");
  assertEquals(p.get("starting_after"), "cur");
});

Deno.test("list-campaigns: returns the page verbatim", async () => {
  const body = { data: [{ id: "cmp1", status: "sent", subject: "Hi" }], paging: {} };
  const { ctx } = mockCtx([{ body }]);
  assertEquals(await action.execute!({}, ctx), body);
});
