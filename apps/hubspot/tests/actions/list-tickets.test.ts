import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-tickets.ts";

Deno.test("list-tickets: GETs /crm/v3/objects/tickets", async () => {
  const { ctx, calls } = mockCtx([{ body: { results: [] } }]);
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/crm/v3/objects/tickets");
});
