import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-asset.ts";

Deno.test("get-asset: GETs /spaces/{s}/environments/{e}/assets/{id} on CDN by default", async () => {
  const body = { sys: { id: "a-1" }, fields: {} };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!(
    { assetId: "a-1", spaceId: "sp", environmentId: "master" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://cdn.contentful.com");
  assertEquals(url.pathname, "/spaces/sp/environments/master/assets/a-1");
  assertEquals(result, body);
});

Deno.test("get-asset: routes to Preview API when source=preview", async () => {
  const { ctx, calls } = mockCtx([{ body: { sys: { id: "a-1" } } }]);
  await action.execute!(
    { assetId: "a-1", spaceId: "sp", environmentId: "master", source: "preview" },
    ctx,
  );
  assertEquals(new URL(calls[0].url).origin, "https://preview.contentful.com");
});

Deno.test("get-asset: falls back to connection.display for space/env", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }], {
    connection: {
      display: { space: { id: "conn-sp" }, environment: { id: "staging" } },
    },
  });
  await action.execute!({ assetId: "a-1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/spaces/conn-sp/environments/staging/assets/a-1");
});
