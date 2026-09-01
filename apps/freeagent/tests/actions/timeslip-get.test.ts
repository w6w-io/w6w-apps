import { assertEquals } from "@std/assert";
import { mockFreeAgentCtx } from "../_helpers.ts";
import action from "../../actions/timeslip-get.ts";

Deno.test("timeslip-get: GETs /timeslips/:id", async () => {
  const { ctx, calls } = mockFreeAgentCtx([{ body: { timeslip: { url: "x" } } }]);
  await action.execute({ timeslipId: "25" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/timeslips/25");
});
