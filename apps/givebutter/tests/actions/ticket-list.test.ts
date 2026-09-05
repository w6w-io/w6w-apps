import { assertEquals } from "@std/assert";
import ticketList from "../../actions/ticket-list.ts";
import { mockCtx, pageEnvelope, pathOf } from "../_helpers.ts";

Deno.test("ticket-list: hits /tickets", async () => {
  const { ctx, calls } = mockCtx([{ body: pageEnvelope([{ id: "t1" }]) }]);
  await ticketList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/tickets");
});
