import { assertEquals } from "@std/assert";
import issuedTicketList from "../../actions/issued-ticket-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("issued-ticket-list: hits GET /issued_tickets with the documented filters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope([{ id: "it_1" }]) }]);
  await issuedTicketList.execute({ status: "valid", barcode: "123456" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/issued_tickets");
  assertEquals(queryOf(calls[0].url), { status: "valid", barcode: "123456" });
});
