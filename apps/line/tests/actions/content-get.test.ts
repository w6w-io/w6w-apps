import { assert, assertEquals, assertRejects } from "@std/assert";
import contentGet from "../../actions/content-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("content-get: GETs on api-data.line.me, not api.line.me", async () => {
  const { ctx, calls } = mockCtx([{
    body: "fake-image-bytes",
    headers: { "content-type": "image/jpeg" },
  }]);
  const out = await contentGet.execute({ messageId: "325708" }, ctx) as {
    contentType: string;
    base64: string;
    bytes: number;
  };

  assertEquals(calls[0].url, "https://api-data.line.me/v2/bot/message/325708/content");
  assertEquals(pathOf(calls[0].url), "/v2/bot/message/325708/content");
  assertEquals(out.contentType, "image/jpeg");
  assertEquals(atob(out.base64), "fake-image-bytes");
  assertEquals(out.bytes, "fake-image-bytes".length);
});

Deno.test("content-get: requires a messageId", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await contentGet.execute({ messageId: "" }, ctx),
    Error,
    "messageId",
  );
  assertEquals(calls.length, 0);
});

Deno.test("content-get: a 410 (unsent message) surfaces LINE's own message", async () => {
  const { ctx } = mockCtx([{ status: 410, body: { message: "The content is gone" } }]);
  await assertRejects(
    async () => await contentGet.execute({ messageId: "1" }, ctx),
    Error,
    "The content is gone",
  );
});

Deno.test("content-get: refuses content over its size ceiling", async () => {
  const big = "x".repeat(21_000_000);
  const { ctx } = mockCtx([{ body: big, headers: { "content-type": "application/octet-stream" } }]);
  await assertRejects(
    async () => await contentGet.execute({ messageId: "1" }, ctx),
    Error,
    "ceiling",
  );
});

Deno.test("content-get: is a read action", () => {
  assertEquals(contentGet.type, "read");
  assert(Array.isArray(contentGet.output));
});
