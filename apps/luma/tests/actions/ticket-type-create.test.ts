import { assertEquals } from "@std/assert";
import ticketTypeCreate from "../../actions/ticket-type-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("ticket-type-create: posts event_id + the required fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "ttype-1", name: "Standard" } }]);
  const out = await ticketTypeCreate.execute(
    { eventId: "evt-1", name: "Standard", type: "free" },
    ctx,
  ) as { id: string };

  assertEquals(pathOf(calls[0].url), "/v1/events/ticket-types/create");
  assertEquals(JSON.parse(calls[0].body!), { event_id: "evt-1", name: "Standard", type: "free" });
  assertEquals(out.id, "ttype-1");
});

Deno.test("ticket-type-create: paid fields are included when set", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "ttype-2" } }]);
  await ticketTypeCreate.execute(
    { eventId: "evt-1", name: "VIP", type: "paid", cents: 5000, currency: "usd" },
    ctx,
  );

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.cents, 5000);
  assertEquals(body.currency, "usd");
});
