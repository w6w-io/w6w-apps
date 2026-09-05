import { assertEquals } from "@std/assert";
import issuedTicketGet from "../../actions/issued-ticket-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("issued-ticket-get: hits GET /issued_tickets/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { id: "it_1", checked_in: "false" } }]);
  const result = await issuedTicketGet.execute({ issuedTicketId: "it_1" }, ctx) as {
    checked_in: string;
  };
  assertEquals(pathOf(calls[0].url), "/v1/issued_tickets/it_1");
  assertEquals(result.checked_in, "false");
});
