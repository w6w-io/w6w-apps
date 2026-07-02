import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-entry.ts";

Deno.test("create-entry: POSTs to Management API with X-Contentful-Content-Type header", async () => {
  const body = { sys: { id: "e-new", version: 1 }, fields: {} };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!(
    {
      contentTypeId: "post",
      spaceId: "sp",
      environmentId: "master",
      fields: { title: { "en-US": "Hi" } },
    },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.contentful.com");
  assertEquals(url.pathname, "/spaces/sp/environments/master/entries");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["x-contentful-content-type"], "post");
  assertEquals(
    calls[0].headers["content-type"],
    "application/vnd.contentful.management.v1+json",
  );
  assertEquals(
    JSON.parse(calls[0].body ?? ""),
    { fields: { title: { "en-US": "Hi" } } },
  );
  assertEquals(result, body);
});
