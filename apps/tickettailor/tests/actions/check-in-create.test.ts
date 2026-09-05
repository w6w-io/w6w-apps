import { assertEquals } from "@std/assert";
import checkInCreate from "../../actions/check-in-create.ts";
import { mockCtxWithInvocation } from "../_helpers.ts";

Deno.test("check-in-create: sends the invocationId as local_unique_id for retry safety", async () => {
  const { ctx, calls } = mockCtxWithInvocation(
    [{ status: 201, body: { id: "ci_1", quantity: 1 } }],
    "inv-abc-123",
  );
  await checkInCreate.execute({ issuedTicketId: "it_1", quantity: "1" }, ctx);
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("issued_ticket_id"), "it_1");
  assertEquals(body.get("quantity"), "1");
  assertEquals(body.get("local_unique_id"), "inv-abc-123");
});

Deno.test("check-in-create: quantity -1 checks a ticket out", async () => {
  const { ctx, calls } = mockCtxWithInvocation([{ status: 201, body: { id: "ci_2" } }]);
  await checkInCreate.execute({ issuedTicketId: "it_1", quantity: "-1" }, ctx);
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("quantity"), "-1");
});
