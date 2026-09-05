import { assertEquals } from "@std/assert";
import ticketGet from "../../actions/ticket-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("ticket-get: fetches /tickets/{uid}", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: "t1", name: "Jane Doe" }) }]);
  const out = await ticketGet.execute({ id: "t1" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v1/tickets/t1");
  assertEquals(out, { id: "t1", name: "Jane Doe" });
});
