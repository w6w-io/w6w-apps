import { assertEquals } from "@std/assert";
import { mockNinjaCtx } from "../_helpers.ts";
import action from "../../actions/client-delete.ts";

Deno.test("client-delete: DELETEs /clients/{id}", async () => {
  const { ctx, calls } = mockNinjaCtx([{ status: 204 }]);
  const out = await action.execute({ clientId: "abc" }, ctx);
  assertEquals(calls[0].url, "https://acme.invoicing.co/api/v1/clients/abc");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(out, {});
});
