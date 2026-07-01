import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-members.ts";

Deno.test("list-members: applies defaults (count=500, offset=0)", async () => {
  const { ctx, calls } = mockCtx([{ body: { members: [], total_items: 0 } }]);
  await action.execute!({ listId: "abc" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/3.0/lists/abc/members");
  assertEquals(url.searchParams.get("count"), "500");
  assertEquals(url.searchParams.get("offset"), "0");
});

Deno.test("list-members: forwards all optional filters when provided", async () => {
  const { ctx, calls } = mockCtx([{ body: { members: [] } }]);
  await action.execute!(
    {
      listId: "abc",
      status: "subscribed",
      emailType: "html",
      sinceLastChanged: "2026-01-01T00:00:00Z",
      beforeLastChanged: "2026-02-01T00:00:00Z",
      beforeTimestampOpt: "2026-01-15T00:00:00Z",
      count: 25,
      offset: 100,
    },
    ctx,
  );
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("status"), "subscribed");
  assertEquals(p.get("email_type"), "html");
  assertEquals(p.get("since_last_changed"), "2026-01-01T00:00:00Z");
  assertEquals(p.get("before_last_changed"), "2026-02-01T00:00:00Z");
  assertEquals(p.get("before_timestamp_opt"), "2026-01-15T00:00:00Z");
  assertEquals(p.get("count"), "25");
  assertEquals(p.get("offset"), "100");
});
