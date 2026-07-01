import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import { encodeForm, SlackClient } from "../../lib/client.ts";

Deno.test("client: JSON body sets application/json content-type", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const client = new SlackClient(ctx);
  await client.request("/chat.postMessage", {
    method: "POST",
    body: { channel: "C1", text: "hi" },
  });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["content-type"], "application/json; charset=utf-8");
  assertEquals(JSON.parse(calls[0].body!), { channel: "C1", text: "hi" });
});

Deno.test("client: form content-type triggers URLSearchParams body", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const client = new SlackClient(ctx);
  await client.request("/files.upload", {
    method: "POST",
    body: { channel: "C1", content: "hello" },
    contentType: "application/x-www-form-urlencoded",
  });
  assertEquals(calls[0].headers["content-type"], "application/x-www-form-urlencoded");
  const params = new URLSearchParams(calls[0].body!);
  assertEquals(params.get("channel"), "C1");
  assertEquals(params.get("content"), "hello");
});

Deno.test("client: throws when Slack returns { ok: false, error }", async () => {
  const { ctx } = mockCtx([{ body: { ok: false, error: "channel_not_found" } }]);
  const client = new SlackClient(ctx);
  await assertRejects(
    () => client.request("/conversations.info", { query: { channel: "Cxx" } }),
    Error,
    "channel_not_found",
  );
});

Deno.test("client: surfaces `needed` scopes in the error message", async () => {
  const { ctx } = mockCtx([{ body: { ok: false, error: "missing_scope", needed: "chat:write" } }]);
  const client = new SlackClient(ctx);
  await assertRejects(
    () => client.request("/chat.postMessage", { method: "POST", body: {} }),
    Error,
    "chat:write",
  );
});

Deno.test("client: throws on HTTP non-2xx", async () => {
  const { ctx } = mockCtx([{ status: 500, statusText: "Server Error", body: "boom" }]);
  const client = new SlackClient(ctx);
  await assertRejects(
    () => client.request("/foo"),
    Error,
    "Slack 500",
  );
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const client = new SlackClient(ctx);
  await client.request("/x", {
    query: { a: "kept", b: undefined, c: null, d: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), "kept");
  assertEquals(url.searchParams.has("b"), false);
  assertEquals(url.searchParams.has("c"), false);
  assertEquals(url.searchParams.has("d"), false);
});

Deno.test("client: absolute URLs pass through unchanged (upload_url case)", async () => {
  const { ctx, calls } = mockCtx([{ body: { ok: true } }]);
  const client = new SlackClient(ctx);
  await client.request("https://files.slack.example/upload?x=1");
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://files.slack.example");
  assertEquals(url.pathname, "/upload");
});

Deno.test("encodeForm: JSON-stringifies nested arrays/objects (Slack quirk)", () => {
  const out = encodeForm({
    channel: "C1",
    blocks: [{ type: "section", text: { type: "mrkdwn", text: "hi" } }],
    text: "fallback",
    dropped: "",
    also_dropped: null,
  });
  const params = new URLSearchParams(out);
  assertEquals(params.get("channel"), "C1");
  assertEquals(params.get("text"), "fallback");
  assertEquals(JSON.parse(params.get("blocks")!), [
    { type: "section", text: { type: "mrkdwn", text: "hi" } },
  ]);
  assertEquals(params.has("dropped"), false);
  assertEquals(params.has("also_dropped"), false);
});
