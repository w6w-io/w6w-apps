import { assertEquals } from "@std/assert";
import ticketList from "../../actions/ticket-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("ticket-list: hits /api/v1/tickets", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 123456, price: 1.04 }] }]);
  const out = await ticketList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/tickets");
  assertEquals((out as { data: unknown[] }).data.length, 1);
});

Deno.test("ticket-list: passes payment_status=refunded through as a plain string", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await ticketList.execute({ payment_status: "refunded" }, ctx);
  assertEquals(queryOf(calls[0].url).payment_status, "refunded");
});

Deno.test("ticket-list: an unset payment_status is omitted", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await ticketList.execute({}, ctx);
  assertEquals(queryOf(calls[0].url).payment_status, undefined);
});
