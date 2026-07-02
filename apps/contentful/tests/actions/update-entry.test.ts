import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/update-entry.ts";

Deno.test("update-entry: PUTs to Management API with X-Contentful-Version header", async () => {
  const body = { sys: { id: "e-1", version: 5 }, fields: {} };
  const { ctx, calls } = mockCtx([{ body }]);
  const result = await action.execute!(
    {
      entryId: "e-1",
      spaceId: "sp",
      environmentId: "master",
      fields: { title: { "en-US": "Updated" } },
      version: 4,
    },
    ctx,
  );

  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.contentful.com");
  assertEquals(url.pathname, "/spaces/sp/environments/master/entries/e-1");
  assertEquals(calls[0].method, "PUT");
  assertEquals(calls[0].headers["x-contentful-version"], "4");
  assertEquals(
    JSON.parse(calls[0].body ?? ""),
    { fields: { title: { "en-US": "Updated" } } },
  );
  assertEquals(result, body);
});
