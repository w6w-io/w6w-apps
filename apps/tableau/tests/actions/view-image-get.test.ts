import { assertEquals } from "@std/assert";
import { DEFAULT_DISPLAY, mockCtx } from "../_helpers.ts";
import action from "../../actions/view-image-get.ts";

Deno.test("view-image-get: returns base64 bytes and the response content type", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: "PNGBYTES", headers: { "content-type": "image/png" } }],
    { display: DEFAULT_DISPLAY },
  );
  const result = await action.execute!({ viewId: "v1" }, ctx) as {
    base64: string;
    contentType: string;
  };
  assertEquals(atob(result.base64), "PNGBYTES");
  assertEquals(result.contentType, "image/png");
  assertEquals(new URL(calls[0].url).pathname, "/api/3.21/sites/site-1/views/v1/image");
});

Deno.test("view-image-get: resolution and maxAge reach the query string", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: "x", headers: { "content-type": "image/png" } }],
    { display: DEFAULT_DISPLAY },
  );
  await action.execute!({ viewId: "v1", resolution: "high", maxAgeMinutes: 60 }, ctx);
  const q = new URL(calls[0].url).searchParams;
  assertEquals(q.get("resolution"), "high");
  assertEquals(q.get("maxAge"), "60");
});
