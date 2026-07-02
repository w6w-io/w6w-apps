import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-entries.ts";

Deno.test("list-entries: hits CDN with default paging", async () => {
  const body = { items: [], total: 0, skip: 0, limit: 100 };
  const { ctx, calls } = mockCtx([{ body }]);
  await action.execute!({ spaceId: "sp", environmentId: "master" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/spaces/sp/environments/master/entries");
  assertEquals(url.searchParams.get("limit"), "100");
  assertEquals(url.searchParams.get("skip"), "0");
});

Deno.test("list-entries: forwards content_type and search extras", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute!(
    {
      spaceId: "sp",
      environmentId: "master",
      content_type: "post",
      equal: "fields.slug=hello",
      exclude: "fields.tags[nin]=draft",
      order: "-sys.createdAt",
    },
    ctx,
  );
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("content_type"), "post");
  assertEquals(params.get("fields.slug"), "hello");
  assertEquals(params.get("fields.tags[nin]"), "draft");
  assertEquals(params.get("order"), "-sys.createdAt");
});

Deno.test("list-entries: uses connection display when params are omitted", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }], {
    connection: {
      display: { space: { id: "conn-sp" }, environment: { id: "staging" } },
    },
  });
  await action.execute!({}, ctx);
  assertEquals(
    new URL(calls[0].url).pathname,
    "/spaces/conn-sp/environments/staging/entries",
  );
});

Deno.test("list-entries: omits unset extras", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute!({ spaceId: "sp", environmentId: "master" }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assert(!params.has("content_type"));
  assert(!params.has("query"));
});
