import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action, { parseEmailList } from "../../actions/send-email.ts";

Deno.test("parseEmailList: accepts plain, comma-separated, and Name-<addr> forms", () => {
  assertEquals(parseEmailList("a@x.com"), [{ email: "a@x.com" }]);
  assertEquals(parseEmailList("a@x.com, b@x.com"), [{ email: "a@x.com" }, { email: "b@x.com" }]);
  assertEquals(parseEmailList("Ada <a@x.com>"), [{ email: "a@x.com", name: "Ada" }]);
  assertEquals(
    parseEmailList("Ada <a@x.com>, Bo <b@x.com>"),
    [{ email: "a@x.com", name: "Ada" }, { email: "b@x.com", name: "Bo" }],
  );
});

Deno.test("parseEmailList: strips wrapping quotes from names", () => {
  assertEquals(parseEmailList('"Ada Lovelace" <a@x.com>'), [
    { email: "a@x.com", name: "Ada Lovelace" },
  ]);
});

Deno.test("parseEmailList: passes structured input through unchanged", () => {
  assertEquals(
    parseEmailList([{ email: "a@x.com", name: "Ada" }, { email: "b@x.com" }]),
    [{ email: "a@x.com", name: "Ada" }, { email: "b@x.com" }],
  );
});

Deno.test("send-email: POSTs /v3/smtp/email with parsed sender/to and subject", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { messageId: "abc" } }]);
  await action.execute!(
    {
      sender: "Ada <ada@x.com>",
      to: "bob@x.com",
      subject: "Hi",
      textContent: "Hello",
    },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/smtp/email");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.sender, { email: "ada@x.com", name: "Ada" });
  assertEquals(body.to, [{ email: "bob@x.com" }]);
  assertEquals(body.subject, "Hi");
  assertEquals(body.textContent, "Hello");
});

Deno.test("send-email: forwards htmlContent, cc, bcc, replyTo when provided", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute!(
    {
      sender: { email: "ada@x.com" },
      to: [{ email: "bob@x.com" }],
      subject: "Hi",
      htmlContent: "<p>Hello</p>",
      cc: "cc@x.com",
      bcc: "bcc1@x.com, bcc2@x.com",
      replyTo: "reply@x.com",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.htmlContent, "<p>Hello</p>");
  assertEquals(body.cc, [{ email: "cc@x.com" }]);
  assertEquals(body.bcc, [{ email: "bcc1@x.com" }, { email: "bcc2@x.com" }]);
  assertEquals(body.replyTo, { email: "reply@x.com" });
});

Deno.test("send-email: normalizes tags string to an array; forwards array as-is", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }, { status: 201, body: {} }]);
  await action.execute!(
    { sender: "ada@x.com", to: "bob@x.com", subject: "Hi", tags: "vip, promo" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).tags, ["vip", "promo"]);
  await action.execute!(
    { sender: "ada@x.com", to: "bob@x.com", subject: "Hi", tags: ["a", "b"] },
    ctx,
  );
  assertEquals(JSON.parse(calls[1].body!).tags, ["a", "b"]);
});

Deno.test("send-email: forwards attachment and template params when provided", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute!(
    {
      sender: "ada@x.com",
      to: "bob@x.com",
      subject: "Hi",
      attachment: [{ url: "https://x.com/f.pdf" }],
      params: { plan: "pro" },
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.attachment, [{ url: "https://x.com/f.pdf" }]);
  assertEquals(body.params, { plan: "pro" });
});
