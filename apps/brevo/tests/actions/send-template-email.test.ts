import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/send-template-email.ts";

Deno.test("send-template-email: POSTs /v3/smtp/email with templateId and parsed recipients", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { messageId: "abc" } }]);
  await action.execute!(
    { templateId: 42, to: "Ada <ada@x.com>, bob@x.com" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/smtp/email");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.templateId, 42);
  assertEquals(body.to, [{ email: "ada@x.com", name: "Ada" }, { email: "bob@x.com" }]);
});

Deno.test("send-template-email: forwards template params, cc, bcc, tags, attachments", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute!(
    {
      templateId: 42,
      to: "bob@x.com",
      cc: "cc@x.com",
      bcc: "bcc@x.com",
      params: { firstName: "Bob" },
      tags: ["promo"],
      attachment: [{ content: "aGVsbG8=", name: "hi.txt" }],
      headers: { "X-Camp": "spring-2025" },
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.params, { firstName: "Bob" });
  assertEquals(body.cc, [{ email: "cc@x.com" }]);
  assertEquals(body.bcc, [{ email: "bcc@x.com" }]);
  assertEquals(body.tags, ["promo"]);
  assertEquals(body.attachment, [{ content: "aGVsbG8=", name: "hi.txt" }]);
  assertEquals(body.headers, { "X-Camp": "spring-2025" });
});

Deno.test("send-template-email: omits optional fields when not provided", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await action.execute!({ templateId: 1, to: "bob@x.com" }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals("cc" in body, false);
  assertEquals("bcc" in body, false);
  assertEquals("params" in body, false);
  assertEquals("attachment" in body, false);
  assertEquals("tags" in body, false);
});
