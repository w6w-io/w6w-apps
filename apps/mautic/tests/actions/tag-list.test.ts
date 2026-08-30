import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/tag-list.ts";

const conn = { display: { baseUrl: "https://mautic.example.com" } };

/** Tags is the one collection Mautic returns as a bare array, not an id-keyed map. */
Deno.test("tag-list: GETs /tags and passes the bare-array `tags` collection through", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { total: 1, tags: [{ id: 34, tag: "tagA" }] } },
  ], conn);
  const out = await action.execute!({}, ctx);
  assertEquals(calls[0].url.startsWith("https://mautic.example.com/api/tags"), true);
  assertEquals(out, [{ id: 34, tag: "tagA" }]);
});
