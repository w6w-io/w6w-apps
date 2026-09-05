import { assertEquals } from "@std/assert";
import ticketTypeCreate from "../../actions/ticket-type-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("ticket-type-create: sends discounts as repeated discounts[] fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "tt_1" } }]);
  await ticketTypeCreate.execute(
    {
      eventSeriesId: "es_1",
      name: "General Admission",
      price: 600,
      quantity: 100,
      discounts: "di_1, di_2",
    },
    ctx,
  );
  assertEquals(pathOf(calls[0].url), "/v1/event_series/es_1/ticket_types");
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.getAll("discounts[]"), ["di_1", "di_2"]);
  assertEquals(body.get("price"), "600");
  assertEquals(body.get("quantity"), "100");
});
