import { assertEquals } from "@std/assert";
import { mockFreeAgentCtx } from "../_helpers.ts";
import action from "../../actions/timeslip-delete.ts";

Deno.test("timeslip-delete: DELETEs /timeslips/:id", async () => {
  const { ctx, calls } = mockFreeAgentCtx([{ status: 200 }]);
  const out = await action.execute({ timeslipId: "25" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/timeslips/25");
  assertEquals(out, {});
});
