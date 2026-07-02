import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-entry.ts";

Deno.test("get-entry: GETs /entries/{id} on CDN by default", async () => {
  const body = { sys: { id: "e-1" }, fields: { title: { "en-US": "Hi" } } };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!(
    { entryId: "e-1", spaceId: "sp", environmentId: "master" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://cdn.contentful.com");
  assertEquals(url.pathname, "/spaces/sp/environments/master/entries/e-1");
  assertEquals(result, body);
});

Deno.test("get-entry: routes to Preview API for drafts", async () => {
  const { ctx, calls } = mockCtx([{ body: { sys: { id: "e-1" } } }]);
  await action.execute!(
    { entryId: "e-1", spaceId: "sp", environmentId: "master", source: "preview" },
    ctx,
  );
  assertEquals(new URL(calls[0].url).origin, "https://preview.contentful.com");
});
