import { assertEquals } from "@std/assert";
import { mockGorgiasCtx } from "../_helpers.ts";
import action from "../../actions/survey-create.ts";

Deno.test("survey-create: POSTs /satisfaction-surveys with ticket and customer ids", async () => {
  const { ctx, calls } = mockGorgiasCtx([{ body: { id: 1234 } }]);
  await action.execute({ ticketId: 12, customerId: 120 }, ctx);
  assertEquals(calls[0].url, "https://acme.gorgias.com/api/satisfaction-surveys");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.ticket_id, 12);
  assertEquals(body.customer_id, 120);
  assertEquals(body.should_send_datetime, undefined);
});

Deno.test("survey-create: passes through shouldSendDatetime, bodyText and score", async () => {
  const { ctx, calls } = mockGorgiasCtx([{ body: {} }]);
  await action.execute(
    {
      ticketId: 12,
      customerId: 120,
      shouldSendDatetime: "2026-08-29T00:00:00Z",
      bodyText: "Great support",
      score: 5,
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.should_send_datetime, "2026-08-29T00:00:00Z");
  assertEquals(body.body_text, "Great support");
  assertEquals(body.score, 5);
});
