import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-content-types.ts";

Deno.test("list-content-types: GETs /content_types with default paging", async () => {
  const body = { items: [], total: 0, skip: 0, limit: 100 };
  const { ctx, calls } = mockCtx([{ body }]);
  await action.execute!({ spaceId: "sp", environmentId: "master" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/spaces/sp/environments/master/content_types");
  assertEquals(url.searchParams.get("limit"), "100");
});

Deno.test("list-content-types: honors order and skip", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute!(
    { spaceId: "sp", environmentId: "master", skip: 10, order: "sys.createdAt" },
    ctx,
  );
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("skip"), "10");
  assertEquals(params.get("order"), "sys.createdAt");
});
