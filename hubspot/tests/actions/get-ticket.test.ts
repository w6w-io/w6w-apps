import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/get-ticket.ts";

Deno.test("get-ticket: GETs /crm/v3/objects/tickets/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "t1" } }]);
  await action.execute!({ id: "t1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/crm/v3/objects/tickets/t1");
});
