import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/comments-list.ts";

const conn = { display: { baseUrl: "https://acme.cybozu.com" } };

Deno.test("comments-list: GETs /k/v1/record/comments.json with paging params", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { comments: [{ id: "1" }], older: false, newer: false } }],
    conn,
  );
  const out = await action.execute(
    { appId: "1", recordId: "1", order: "asc", offset: 10, limit: 5 },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/k/v1/record/comments.json");
  assertEquals(url.searchParams.get("order"), "asc");
  assertEquals(url.searchParams.get("offset"), "10");
  assertEquals(url.searchParams.get("limit"), "5");
  assertEquals(out.comments, [{ id: "1" }]);
});
