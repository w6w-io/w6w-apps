import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-locales.ts";

Deno.test("list-locales: GETs /locales with default paging", async () => {
  const body = { items: [{ code: "en-US" }], total: 1, skip: 0, limit: 100 };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!({ spaceId: "sp", environmentId: "master" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://cdn.contentful.com");
  assertEquals(url.pathname, "/spaces/sp/environments/master/locales");
  assertEquals(url.searchParams.get("limit"), "100");
  assertEquals(result, body);
});

Deno.test("list-locales: honors limit/skip and preview source", async () => {
  const { ctx, calls } = mockCtx([{ body: { items: [] } }]);
  await action.execute!(
    { spaceId: "sp", environmentId: "master", limit: 5, skip: 2, source: "preview" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://preview.contentful.com");
  assertEquals(url.searchParams.get("limit"), "5");
  assertEquals(url.searchParams.get("skip"), "2");
});
