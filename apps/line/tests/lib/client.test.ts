import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  asJson,
  base64ToBytes,
  bytesToBase64,
  compact,
  formatLineError,
  LineClient,
  toStringList,
} from "../../lib/client.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("formatLineError: plain message, no details", () => {
  const msg = formatLineError(401, "GET", "/v2/bot/info", JSON.stringify({ message: "nope" }));
  assertEquals(msg, "LINE 401 for GET /v2/bot/info — nope");
});

Deno.test("formatLineError: includes per-field details", () => {
  const raw = JSON.stringify({
    message: "The request body has 1 error(s)",
    details: [{ message: "May not be empty", property: "messages[0].text" }],
  });
  const msg = formatLineError(400, "POST", "/v2/bot/message/push", raw);
  assert(msg.includes("messages[0].text: May not be empty"), msg);
});

Deno.test("formatLineError: falls back to the raw body when it is not JSON", () => {
  const msg = formatLineError(500, "GET", "/x", "upstream exploded");
  assertEquals(msg, "LINE 500 for GET /x: upstream exploded");
});

Deno.test("compact: drops undefined, null and empty string but keeps false/0", () => {
  assertEquals(
    compact({ a: undefined, b: null, c: "", d: false, e: 0, f: "x" }),
    { d: false, e: 0, f: "x" },
  );
});

Deno.test("asJson: passes through an already-parsed value", () => {
  assertEquals(asJson({ a: 1 }, "x"), { a: 1 });
});

Deno.test("asJson: parses a JSON string", () => {
  assertEquals(asJson('[{"type":"text","text":"hi"}]', "messages"), [
    { type: "text", text: "hi" },
  ]);
});

Deno.test("asJson: rejects malformed JSON with the field name in the message", () => {
  let threw = false;
  try {
    asJson("{not json", "messages");
  } catch (e) {
    threw = true;
    assert(e instanceof Error && /messages is not valid JSON/.test(e.message));
  }
  assert(threw);
});

Deno.test("asJson: rejects an empty/missing value", () => {
  let threw = false;
  try {
    asJson(undefined, "messages");
  } catch (e) {
    threw = true;
    assert(e instanceof Error && /messages is required/.test(e.message));
  }
  assert(threw);
});

Deno.test("toStringList: accepts an array or a comma-separated string, drops blanks", () => {
  assertEquals(toStringList(["a", " b ", ""]), ["a", "b"]);
  assertEquals(toStringList("a, b ,c"), ["a", "b", "c"]);
  assertEquals(toStringList(""), undefined);
  assertEquals(toStringList(undefined), undefined);
});

Deno.test("base64ToBytes / bytesToBase64 round-trip, plain base64 and a data: URI", () => {
  const bytes = new Uint8Array([0, 1, 2, 253, 254, 255]);
  const b64 = bytesToBase64(bytes);
  assertEquals(base64ToBytes(b64), bytes);
  assertEquals(base64ToBytes(`data:image/png;base64,${b64}`), bytes);
});

Deno.test("LineClient.json: GETs and parses a JSON body", async () => {
  const { ctx, calls } = mockCtx([{ body: { userId: "U1", displayName: "Bot" } }]);
  const out = await new LineClient(ctx).json<{ userId: string }>("/v2/bot/info");
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/bot/info");
  assertEquals(out.userId, "U1");
});

Deno.test("LineClient.json: POSTs a JSON body with the right content-type", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new LineClient(ctx).json("/v2/bot/message/broadcast", {
    method: "POST",
    body: { messages: [{ type: "text", text: "hi" }] },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json");
  assertEquals(JSON.parse(calls[0].body!), { messages: [{ type: "text", text: "hi" }] });
});

Deno.test("LineClient.json: an empty body (DELETE / 200 with no text) resolves to undefined", async () => {
  const { ctx } = mockCtx([{ status: 200, body: undefined }]);
  const out = await new LineClient(ctx).json("/v2/bot/richmenu/rm1", { method: "DELETE" });
  assertEquals(out, undefined);
});

Deno.test("LineClient.json: a non-ok response throws a formatted error", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { message: "Authentication failed." } }]);
  await assertRejects(
    () => new LineClient(ctx).json("/v2/bot/info"),
    Error,
    "LINE 401 for GET /v2/bot/info",
  );
});

Deno.test("LineClient.json: extra headers (e.g. a retry key) pass through", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await new LineClient(ctx).json("/v2/bot/message/push", {
    method: "POST",
    headers: { "X-Line-Retry-Key": "11111111-1111-1111-1111-111111111111" },
    body: { to: "U1", messages: [] },
  });
  assertEquals(calls[0].headers["x-line-retry-key"], "11111111-1111-1111-1111-111111111111");
});

Deno.test("LineClient.binaryGet: base64-encodes the body and reports the content type", async () => {
  const { ctx, calls } = mockCtx([
    { body: "hello", headers: { "content-type": "image/jpeg" } },
  ]);
  const out = await new LineClient(ctx, "https://api-data.line.me").binaryGet(
    "/v2/bot/message/1/content",
  );
  assertEquals(calls[0].method, "GET");
  assertEquals(out.contentType, "image/jpeg");
  assertEquals(out.bytes, 5);
  assertEquals(atob(out.base64), "hello");
});

Deno.test("LineClient.binaryGet: a non-ok response throws", async () => {
  const { ctx } = mockCtx([{ status: 404, body: { message: "not found" } }]);
  await assertRejects(
    () => new LineClient(ctx, "https://api-data.line.me").binaryGet("/v2/bot/message/1/content"),
    Error,
    "LINE 404",
  );
});

Deno.test("LineClient.binaryPost: sends the exact content-type and bytes as an ArrayBuffer", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);
  const bytes = new Uint8Array([137, 80, 78, 71]);
  await new LineClient(ctx, "https://api-data.line.me").binaryPost(
    "/v2/bot/richmenu/rm1/content",
    bytes,
    "image/png",
  );
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "image/png");
  // The mock records an ArrayBuffer body as its byte length — proof it was never coerced to a
  // string before being handed to `ctx.fetch`.
  assertEquals(calls[0].body, "<4 bytes>");
});

Deno.test("LineClient.binaryPost: a non-ok response throws", async () => {
  const { ctx } = mockCtx([
    { status: 415, body: { message: "Unsupported media type" } },
  ]);
  await assertRejects(
    () =>
      new LineClient(ctx, "https://api-data.line.me").binaryPost(
        "/v2/bot/richmenu/rm1/content",
        new Uint8Array([1]),
        "image/png",
      ),
    Error,
    "LINE 415",
  );
});
