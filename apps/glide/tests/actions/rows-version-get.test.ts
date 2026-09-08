import { assertEquals } from "@std/assert";
import rowsVersionGet from "../../actions/rows-version-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("rows-version-get: issues a HEAD request and reads the ETag header", async () => {
  const { ctx, calls } = mockCtx([{ headers: { etag: '"42"' } }]);
  const out = await rowsVersionGet.execute({ tableId: "t1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/tables/t1/rows");
  assertEquals(calls[0].method, "HEAD");
  assertEquals(out, { etag: '"42"' });
});

Deno.test("rows-version-get: no ETag header reads as undefined, not a thrown error", async () => {
  const { ctx } = mockCtx([{ headers: { "content-type": "application/json" } }]);
  const out = await rowsVersionGet.execute({ tableId: "t1" }, ctx);
  assertEquals(out.etag, undefined);
});
