import { assertEquals } from "@std/assert";
import issuedTicketVoid from "../../actions/issued-ticket-void.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("issued-ticket-void: POSTs to the nested void path", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { id: "it_1", object: "issued_ticket", voided: "true" } },
  ]);
  const result = await issuedTicketVoid.execute({ issuedTicketId: "it_1" }, ctx) as {
    voided: string;
  };
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/issued_tickets/it_1/void");
  assertEquals(result.voided, "true");
});

Deno.test("issued-ticket-void: can turn the voided ticket's allocation into a hold", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "it_1", hold_id: "ho_9" } }]);
  await issuedTicketVoid.execute({ issuedTicketId: "it_1", voidToHold: "true" }, ctx);
  const body = new URLSearchParams(calls[0].body ?? "");
  assertEquals(body.get("void_to_hold"), "true");
});
