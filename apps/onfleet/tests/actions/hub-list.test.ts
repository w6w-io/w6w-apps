import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/hub-list.ts";

Deno.test("hub-list: fetches every hub with no params", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: [{ id: "hub_1" }] }]);
  const result = await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://onfleet.com/api/v2/hubs");
  assertEquals((result as { hubs: unknown[] }).hubs.length, 1);
});
