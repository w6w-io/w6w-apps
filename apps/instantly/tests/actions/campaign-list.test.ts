import { assertEquals } from "@std/assert";
import campaignList from "../../actions/campaign-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("campaign-list: GETs with the search/status/pagination query", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [{ id: "c1" }] } }]);
  const out = await campaignList.execute(
    { search: "Summer", status: 1, limit: 5 },
    ctx,
  ) as { items: unknown[] };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/campaigns");
  assertEquals(queryOf(calls[0].url), { search: "Summer", status: "1", limit: "5" });
  assertEquals(out.items.length, 1);
});

Deno.test("campaign-list: default limit is prefilled at 20", () => {
  const p = campaignList.params?.find((p) => p.key === "limit");
  assertEquals(p?.default, 20);
});

Deno.test("campaign-list: is a search action with no side effects declared", () => {
  assertEquals(campaignList.type, "search");
});
