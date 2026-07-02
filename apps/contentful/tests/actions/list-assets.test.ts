import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-assets.ts";

Deno.test("list-assets: applies default pagination and hits CDN", async () => {
  const body = { items: [], total: 0, skip: 0, limit: 100 };
  const { ctx, calls } = mockCtx([{ body }]);
  await action.execute!({ spaceId: "sp", environmentId: "master" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://cdn.contentful.com");
  assertEquals(url.pathname, "/spaces/sp/environments/master/assets");
  assertEquals(url.searchParams.get("limit"), "100");
  assertEquals(url.searchParams.get("skip"), "0");
});

Deno.test("list-assets: forwards paging + unpacks search extras", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute!(
    {
      spaceId: "sp",
      environmentId: "master",
      limit: 25,
      skip: 50,
      equal: "fields.title=hi",
      order: "sys.createdAt",
      query: "party",
    },
    ctx,
  );
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("limit"), "25");
  assertEquals(params.get("skip"), "50");
  assertEquals(params.get("fields.title"), "hi");
  assertEquals(params.get("order"), "sys.createdAt");
  assertEquals(params.get("query"), "party");
});

Deno.test("list-assets: omits unset search extras", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute!({ spaceId: "sp", environmentId: "master" }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assert(!params.has("order"));
  assert(!params.has("query"));
  assert(!params.has("select"));
});
