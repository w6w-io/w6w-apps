import { assertEquals } from "@std/assert";
import { DEFAULT_DISPLAY, mockCtx } from "../_helpers.ts";
import action from "../../actions/site-get.ts";

Deno.test("site-get: targets /sites/{siteId} with no extra path segment", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { site: { id: "site-1", name: "Marketing", contentUrl: "marketing" } } }],
    { display: DEFAULT_DISPLAY },
  );
  const result = await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/3.21/sites/site-1");
  assertEquals(result, { id: "site-1", name: "Marketing", contentUrl: "marketing" });
});

Deno.test("site-get: includeUsage reaches the query string", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { site: {} } }], {
    display: DEFAULT_DISPLAY,
  });
  await action.execute!({ includeUsage: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("includeUsage"), "true");
});
