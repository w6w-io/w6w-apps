import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/opportunity-list.ts";

Deno.test("opportunity-list: GETs /opportunities with paging and since", async () => {
  const { ctx, calls } = mockCtx([{ body: { opportunities: [{ id: 12 }] } }]);
  const out = await action.execute({ page: 2, since: "2020-01-01T00:00:00Z" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v2/opportunities");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("since"), "2020-01-01T00:00:00Z");
  assertEquals(out, { opportunities: [{ id: 12 }], nextPage: undefined });
});

Deno.test("opportunity-list: embed is comma-joined", async () => {
  const { ctx, calls } = mockCtx([{ body: { opportunities: [] } }]);
  await action.execute({ embed: ["party", "milestone"] }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("embed"), "party,milestone");
});
