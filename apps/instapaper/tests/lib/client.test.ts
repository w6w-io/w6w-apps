import { assert, assertEquals, assertRejects } from "@std/assert";
import { InstapaperClient, isErrorArray } from "../../lib/client.ts";
import { bodyOf, envelope, errorEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("client: call() POSTs form-encoded params to the exact host+path", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ type: "folder", folder_id: 1 }]) }]);
  const items = await new InstapaperClient(ctx).call("/api/1/folders/list");

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/1/folders/list");
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  assertEquals(items, [{ type: "folder", folder_id: 1 }]);
});

Deno.test("client: call() drops undefined/null/empty params from the body", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  await new InstapaperClient(ctx).call("/api/1/bookmarks/list", {
    limit: 25,
    folder_id: undefined,
    tag: "",
    have: null as unknown as undefined,
  });
  assertEquals(bodyOf(calls[0]), { limit: "25" });
});

Deno.test("client: call() throws the vendor's error_code and message on the tagged-error envelope", async () => {
  const { ctx } = mockCtx([{ status: 400, body: errorEnvelope(1240, "Invalid URL specified") }]);
  await assertRejects(
    () => new InstapaperClient(ctx).call("/api/1/bookmarks/add"),
    Error,
    "1240",
  );
});

/**
 * Instapaper's own docs: errors are not reliably tied to a non-2xx status —
 * so the error envelope must be classified by SHAPE, not by the HTTP status
 * that happened to come back with it.
 */
Deno.test("client: call() recognizes the error envelope even under an HTTP 200", async () => {
  const { ctx } = mockCtx([{ status: 200, body: errorEnvelope(1040, "Rate-limit exceeded") }]);
  await assertRejects(
    () => new InstapaperClient(ctx).call("/api/1/bookmarks/list"),
    Error,
    "1040",
  );
});

Deno.test("client: call() treats a non-JSON body as the documented 503-equivalent", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>not json</html>" }]);
  await assertRejects(
    () => new InstapaperClient(ctx).call("/api/1/folders/list"),
    Error,
    "non-JSON",
  );
});

Deno.test("client: call() rejects a JSON body that is not an array", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { unexpected: true } }]);
  await assertRejects(() => new InstapaperClient(ctx).call("/api/1/folders/list"), Error);
});

Deno.test("client: callObject() unwraps bookmarks/list's bespoke {user, bookmarks, ...} shape", async () => {
  const { ctx } = mockCtx([{
    body: {
      user: { type: "user", user_id: 1, username: "a" },
      bookmarks: [{ type: "bookmark", bookmark_id: 5 }],
      highlights: [],
      delete_ids: [9],
    },
  }]);
  const result = await new InstapaperClient(ctx).callObject("/api/1/bookmarks/list");
  assertEquals(result, {
    user: { type: "user", user_id: 1, username: "a" },
    bookmarks: [{ type: "bookmark", bookmark_id: 5 }],
    highlights: [],
    delete_ids: [9],
  });
});

Deno.test("client: callObject() still recognizes the tagged-error envelope", async () => {
  const { ctx } = mockCtx([{ body: errorEnvelope(1500, "Unexpected service error") }]);
  await assertRejects(
    () => new InstapaperClient(ctx).callObject("/api/1/bookmarks/list"),
    Error,
    "1500",
  );
});

Deno.test("client: callObject() rejects a bare array as an unexpected shape", async () => {
  const { ctx } = mockCtx([{ body: envelope([{ type: "folder", folder_id: 1 }]) }]);
  await assertRejects(() => new InstapaperClient(ctx).callObject("/api/1/bookmarks/list"), Error);
});

Deno.test("client: callText() returns the raw body verbatim on a 200", async () => {
  const { ctx } = mockCtx([{
    status: 200,
    body: "<html><body>Article text</body></html>",
    headers: { "content-type": "text/html; charset=UTF-8" },
  }]);
  const html = await new InstapaperClient(ctx).callText("/api/1/bookmarks/get_text");
  assertEquals(html, "<html><body>Article text</body></html>");
});

Deno.test("client: callText() throws the vendor error on a non-200", async () => {
  const { ctx } = mockCtx([{
    status: 400,
    body: errorEnvelope(1241, "Invalid or missing bookmark_id"),
  }]);
  await assertRejects(
    () => new InstapaperClient(ctx).callText("/api/1/bookmarks/get_text"),
    Error,
    "1241",
  );
});

Deno.test("client: callVoid() accepts a genuinely empty body as success", async () => {
  const { ctx } = mockCtx([{ status: 200, body: undefined }]);
  await new InstapaperClient(ctx).callVoid("/api/1.1/highlights/1/delete");
});

Deno.test("client: callVoid() still throws on the tagged-error envelope", async () => {
  const { ctx } = mockCtx([{ status: 400, body: errorEnvelope(1500, "Unexpected service error") }]);
  await assertRejects(
    () => new InstapaperClient(ctx).callVoid("/api/1.1/highlights/1/delete"),
    Error,
    "1500",
  );
});

Deno.test("isErrorArray: recognizes only the documented shape", () => {
  assert(isErrorArray([{ type: "error", error_code: 1, message: "x" }]));
  assert(!isErrorArray([{ type: "bookmark", bookmark_id: 1 }]));
  assert(!isErrorArray([]));
  assert(!isErrorArray({}));
  assert(!isErrorArray(null));
});
