import { assertEquals } from "@std/assert";
import { mockDeskCtx } from "../_helpers.ts";
import action from "../../actions/search-records.ts";

Deno.test("search-records: GETs /search with searchStr and module", async () => {
  const { ctx, calls } = mockDeskCtx([{ body: { data: [{ id: "1" }] } }]);
  const out = await action.execute({ searchStr: "zylker", module: "tickets" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/v1/search");
  assertEquals(url.searchParams.get("searchStr"), "zylker");
  assertEquals(url.searchParams.get("module"), "tickets");
  assertEquals(calls[0].headers.orgid, "2389290");
  assertEquals(out.data, [{ id: "1" }]);
});

Deno.test("search-records: type is search, not read", () => {
  assertEquals(action.type, "search");
});
