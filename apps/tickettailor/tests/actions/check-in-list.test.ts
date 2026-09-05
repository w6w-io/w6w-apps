import { assertEquals } from "@std/assert";
import checkInList from "../../actions/check-in-list.ts";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("check-in-list: hits GET /check_ins with the documented filters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope([{ id: "ci_1" }]) }]);
  await checkInList.execute({ issuedTicketId: "it_1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/check_ins");
  assertEquals(queryOf(calls[0].url), { issued_ticket_id: "it_1" });
});
