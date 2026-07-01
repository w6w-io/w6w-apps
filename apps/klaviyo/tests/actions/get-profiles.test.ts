import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-profiles.ts";

Deno.test("get-profiles: GETs /profiles/ and forwards filter, sort, page[cursor], page[size]", async () => {
  const body = { data: [], links: {} };
  const { ctx, calls } = mockCtx([{ body }]);
  await action.execute!(
    {
      filter: 'equals(email,"a@x.com")',
      sort: "-created",
      pageCursor: "cur-123",
      pageSize: 50,
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/api/profiles/");
  assertEquals(url.searchParams.get("filter"), 'equals(email,"a@x.com")');
  assertEquals(url.searchParams.get("sort"), "-created");
  assertEquals(url.searchParams.get("page[cursor]"), "cur-123");
  assertEquals(url.searchParams.get("page[size]"), "50");
});
