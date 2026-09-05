import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/url-inspection-inspect.ts";

Deno.test("url-inspection-inspect: POSTs to the v1 (not webmasters/v3) path", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { inspectionResult: {} } }], {
    display: { siteUrl: "https://www.example.com/" },
  });
  await action.execute!({ inspectionUrl: "https://www.example.com/page" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(
    new URL(calls[0].url).pathname,
    "/v1/urlInspection/index:inspect",
  );
  const body = JSON.parse(calls[0].body!) as Record<string, unknown>;
  assertEquals(body.siteUrl, "https://www.example.com/");
  assertEquals(body.inspectionUrl, "https://www.example.com/page");
  assertEquals("languageCode" in body, false);
});

Deno.test("url-inspection-inspect: inspectionUrl is required", async () => {
  const { ctx, calls } = mockCtx([], { display: { siteUrl: "https://www.example.com/" } });
  await assertRejects(async () => await action.execute!({}, ctx), Error, "`inspectionUrl`");
  assertEquals(calls.length, 0);
});
