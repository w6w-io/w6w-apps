import { assertEquals } from "@std/assert";
import subscriberDelete from "../../actions/subscriber-delete.ts";
import { API_PATH, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("subscriber-delete: DELETEs /subscribers/{listid}.json with the address in the query", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const out = await subscriberDelete.execute({ listId: "lid", email: "a@example.com" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  assertEquals(pathOf(calls[0].url), `${API_PATH}/subscribers/lid.json`);
  assertEquals(queryOf(calls[0].url), { email: "a@example.com" });
  assertEquals(calls[0].body, null);
  assertEquals(out, { EmailAddress: "a@example.com" });
});

Deno.test("subscriber-delete: is declared idempotent", () => {
  assertEquals(subscriberDelete.idempotent, true);
});
