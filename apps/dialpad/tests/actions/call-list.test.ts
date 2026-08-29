import { assertEquals } from "@std/assert";
import callList from "../../actions/call-list.ts";
import { mockCtx, page, pathOf, queryOf } from "../_helpers.ts";

Deno.test("call-list: GETs /call with the filter params as query", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: page([{ call_id: "1" }], "next-cursor") }]);
  const out = await callList.execute(
    { targetId: "42", targetType: "user", startedAfter: 100 },
    ctx,
  ) as { cursor: string | null; items: unknown[] };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/v2/call");
  assertEquals(queryOf(calls[0].url), {
    target_id: "42",
    target_type: "user",
    started_after: "100",
  });
  assertEquals(out.cursor, "next-cursor");
  assertEquals(out.items.length, 1);
});

Deno.test("call-list: declared as a search action", () => {
  assertEquals(callList.type, "search");
});
