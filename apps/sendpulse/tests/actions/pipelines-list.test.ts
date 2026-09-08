import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/pipelines-list.ts";

Deno.test("pipelines-list: hits GET /crm/v1/pipelines", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [{ id: 1, name: "Sales" }] } }]);
  const result = await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://api.sendpulse.com/crm/v1/pipelines");
  assertEquals(calls[0].method, "GET");
  assertEquals(result, { data: [{ id: 1, name: "Sales" }] });
});
