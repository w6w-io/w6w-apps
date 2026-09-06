import { assertEquals } from "@std/assert";
import { mockBooqableCtx } from "../_helpers.ts";
import action from "../../actions/customer-archive.ts";

Deno.test("customer-archive: DELETEs /customers/{id} (a soft archive, not a hard delete)", async () => {
  const { ctx, calls } = mockBooqableCtx([{
    body: { data: { id: "1", attributes: { archived: true } } },
  }]);
  const out = await action.execute({ customerId: "1" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(new URL(calls[0].url).pathname, "/api/4/customers/1");
  assertEquals(
    (out as { data: { attributes: { archived: boolean } } }).data.attributes.archived,
    true,
  );
});
