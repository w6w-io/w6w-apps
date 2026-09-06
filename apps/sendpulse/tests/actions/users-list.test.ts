import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/users-list.ts";

Deno.test("users-list: hits GET /crm/v1/users", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ id: 1 }] } }]);
  const result = await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://api.sendpulse.com/crm/v1/users");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, { data: [{ id: 1 }] });
});
