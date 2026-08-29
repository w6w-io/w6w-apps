import { assertEquals } from "@std/assert";
import { mockGorgiasCtx } from "../_helpers.ts";
import action from "../../actions/ticket-add-reply.ts";

Deno.test("ticket-add-reply: POSTs a public, from-agent message", async () => {
  const { ctx, calls } = mockGorgiasCtx([{ body: { id: 1 } }]);
  await action.execute(
    { ticketId: 12, channel: "email", bodyText: "We shipped it!" },
    ctx,
  );
  assertEquals(calls[0].url, "https://acme.gorgias.com/api/tickets/12/messages");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.channel, "email");
  assertEquals(body.from_agent, true);
  assertEquals(body.public, true);
  assertEquals(body.body_text, "We shipped it!");
});

Deno.test("ticket-add-reply: prefers a receiver id over an email", async () => {
  const { ctx, calls } = mockGorgiasCtx([{ body: {} }]);
  await action.execute(
    {
      ticketId: 12,
      channel: "email",
      bodyText: "hi",
      receiverId: 7,
      receiverEmail: "jo@acme.test",
    },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).receiver, { id: 7 });
});

Deno.test("ticket-add-reply: falls back to a receiver email, and to none", async () => {
  const withEmail = mockGorgiasCtx([{ body: {} }]);
  await action.execute(
    { ticketId: 12, channel: "email", bodyText: "hi", receiverEmail: "jo@acme.test" },
    withEmail.ctx,
  );
  assertEquals(JSON.parse(withEmail.calls[0].body!).receiver, { email: "jo@acme.test" });

  const withNeither = mockGorgiasCtx([{ body: {} }]);
  await action.execute({ ticketId: 12, channel: "email", bodyText: "hi" }, withNeither.ctx);
  assertEquals(JSON.parse(withNeither.calls[0].body!).receiver, undefined);
});
