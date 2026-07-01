import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { decodeBase64Url } from "@std/encoding/base64url";
import { mockCtx } from "../_helpers.ts";
import { buildMimeMessage, GmailClient } from "../../lib/client.ts";

Deno.test("client: 204 returns undefined without parsing a body", async () => {
  const { ctx } = mockCtx([{ status: 204, headers: {} }]);
  const client = new GmailClient(ctx);
  const result = await client.request("/users/me/messages/abc", { method: "DELETE" });
  assertEquals(result, undefined);
});

Deno.test("client: throws a descriptive Error on non-2xx", async () => {
  const { ctx } = mockCtx([
    { status: 404, statusText: "Not Found", body: '{"error":"NOT_FOUND"}' },
  ]);
  const client = new GmailClient(ctx);
  const err = await assertRejects(
    () => client.request("/users/me/messages/missing"),
    Error,
    "Gmail 404",
  );
  assertStringIncludes(err.message, "/gmail/v1/users/me/messages/missing");
});

Deno.test("client: skips null/undefined/empty query params", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new GmailClient(ctx);
  await client.request("/x", {
    query: { a: "kept", b: undefined, c: null, d: "" },
  });
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("a"), "kept");
  assertEquals(url.searchParams.has("b"), false);
  assertEquals(url.searchParams.has("c"), false);
  assertEquals(url.searchParams.has("d"), false);
});

Deno.test("client: repeats array query params (matches Gmail's expected format)", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  const client = new GmailClient(ctx);
  await client.request("/users/me/messages", {
    query: { labelIds: ["INBOX", "UNREAD"] },
  });
  const params = new URL(calls[0].url).searchParams.getAll("labelIds");
  assertEquals(params, ["INBOX", "UNREAD"]);
});

Deno.test("buildMimeMessage: emits a plain-text message when only `text` is set", () => {
  const raw = buildMimeMessage({ to: "a@b.com", subject: "Hi", text: "hello" });
  const decoded = new TextDecoder().decode(decodeBase64Url(raw));
  assertStringIncludes(decoded, "To: a@b.com");
  assertStringIncludes(decoded, "Subject: Hi");
  assertStringIncludes(decoded, "Content-Type: text/plain; charset=UTF-8");
  assertStringIncludes(decoded, "hello");
});

Deno.test("buildMimeMessage: switches to multipart/alternative when both text and html are set", () => {
  const raw = buildMimeMessage({
    to: "a@b.com",
    subject: "Hi",
    text: "hello",
    html: "<p>hello</p>",
  });
  const decoded = new TextDecoder().decode(decodeBase64Url(raw));
  assertStringIncludes(decoded, "Content-Type: multipart/alternative");
  assertStringIncludes(decoded, "Content-Type: text/plain");
  assertStringIncludes(decoded, "Content-Type: text/html");
  assertStringIncludes(decoded, "<p>hello</p>");
});

Deno.test("buildMimeMessage: base64url alphabet only (no +/= padding)", () => {
  const raw = buildMimeMessage({ to: "a@b.com", subject: "S", text: "hi" });
  assertEquals(/^[A-Za-z0-9_-]+$/.test(raw), true);
});

Deno.test("buildMimeMessage: encodes non-ASCII subject as RFC 2047", () => {
  const raw = buildMimeMessage({ to: "a@b.com", subject: "héllo", text: "x" });
  const decoded = new TextDecoder().decode(decodeBase64Url(raw));
  assertStringIncludes(decoded, "=?UTF-8?B?");
});

Deno.test("buildMimeMessage: preserves reply headers when supplied", () => {
  const raw = buildMimeMessage({
    to: "a@b.com",
    subject: "Re: hi",
    text: "hi",
    inReplyTo: "<orig@mail.gmail.com>",
    references: "<older@mail.gmail.com> <orig@mail.gmail.com>",
  });
  const decoded = new TextDecoder().decode(decodeBase64Url(raw));
  assertStringIncludes(decoded, "In-Reply-To: <orig@mail.gmail.com>");
  assertStringIncludes(decoded, "References: <older@mail.gmail.com>");
});
