import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/campaign-create.ts";

interface Input {
  senderName: string;
  senderEmail: string;
  subject: string;
  listId: number;
  body?: string;
  templateId?: string;
  name?: string;
  isTest?: boolean;
  sendDate?: string;
}

function baseInput(overrides: Partial<Input> = {}): Input {
  return {
    senderName: "Ada",
    senderEmail: "ada@example.com",
    subject: "Hello",
    listId: 1,
    body: "<p>Hi</p>",
    ...overrides,
  };
}

Deno.test("campaign-create: base64-encodes the HTML body", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1, status: 13, count: 1 } }]);
  await action.execute!(baseInput(), ctx);
  assertEquals(calls[0].url, "https://api.sendpulse.com/campaigns");
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.body, btoa("<p>Hi</p>"));
  assertEquals(body.sender_name, "Ada");
  assertEquals(body.sender_email, "ada@example.com");
  assertEquals(body.list_id, 1);
});

Deno.test("campaign-create: base64 handles non-Latin1 characters unlike a bare btoa", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  const html = "<p>café — naïve</p>"; // é, em dash, ï — outside btoa's Latin1 range
  await action.execute!(baseInput({ body: html }), ctx);
  const body = JSON.parse(calls[0].body ?? "");
  const decoded = new TextDecoder().decode(
    Uint8Array.from(atob(body.body), (c) => c.charCodeAt(0)),
  );
  assertEquals(decoded, html);
});

Deno.test("campaign-create: templateId is sent as template_id, without a body field", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 1 } }]);
  await action.execute!(baseInput({ body: undefined, templateId: "775667" }), ctx);
  const body = JSON.parse(calls[0].body ?? "");
  assertEquals(body.template_id, "775667");
  assert(!("body" in body));
});

Deno.test("campaign-create: refuses when neither body nor templateId is given", async () => {
  const { ctx, calls } = mockCtx();
  await assertRejects(
    () => Promise.resolve(action.execute!(baseInput({ body: undefined }), ctx)),
    Error,
    "either `body` or `templateId`",
  );
  assertEquals(calls.length, 0);
});

Deno.test("campaign-create: is not idempotent — no idempotency key on this endpoint", () => {
  assertEquals(action.idempotent, false);
});
