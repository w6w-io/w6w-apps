import { assertEquals } from "@std/assert";
import { mockGorgiasCtx } from "../_helpers.ts";
import action from "../../actions/ticket-create.ts";

Deno.test("ticket-create: POSTs /tickets with the ticket and opening message", async () => {
  const { ctx, calls } = mockGorgiasCtx([{ body: { id: 1 } }]);
  await action.execute(
    { subject: "Where is my order?", channel: "email", fromAgent: false, bodyText: "Hi!" },
    ctx,
  );
  assertEquals(calls[0].url, "https://acme.gorgias.com/api/tickets");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.subject, "Where is my order?");
  assertEquals(body.channel, "email");
  assertEquals(body.messages, [{
    channel: "email",
    from_agent: false,
    body_text: "Hi!",
  }]);
});

Deno.test("ticket-create: maps a customer id or email/name to the customer object", async () => {
  const withId = mockGorgiasCtx([{ body: {} }]);
  await action.execute(
    { channel: "email", fromAgent: false, bodyText: "hi", customerId: 42 },
    withId.ctx,
  );
  assertEquals(JSON.parse(withId.calls[0].body!).customer, { id: 42 });

  const withEmail = mockGorgiasCtx([{ body: {} }]);
  await action.execute(
    { channel: "email", fromAgent: false, bodyText: "hi", customerEmail: "jo@acme.test" },
    withEmail.ctx,
  );
  assertEquals(JSON.parse(withEmail.calls[0].body!).customer, { email: "jo@acme.test" });

  const withNeither = mockGorgiasCtx([{ body: {} }]);
  await action.execute({ channel: "email", fromAgent: false, bodyText: "hi" }, withNeither.ctx);
  assertEquals(JSON.parse(withNeither.calls[0].body!).customer, undefined);
});

Deno.test("ticket-create: splits tags into the tag-object array Gorgias expects", async () => {
  const { ctx, calls } = mockGorgiasCtx([{ body: {} }]);
  await action.execute(
    { channel: "email", fromAgent: false, bodyText: "hi", tags: "vip, urgent" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).tags, [{ name: "vip" }, { name: "urgent" }]);
});
