import { assertEquals } from "@std/assert";
import { mockFreeAgentCtx } from "../_helpers.ts";
import action from "../../actions/timeslip-update.ts";

Deno.test("timeslip-update: PUTs /timeslips/:id with the given fields", async () => {
  const { ctx, calls } = mockFreeAgentCtx([{ body: { timeslip: { url: "x" } } }]);
  await action.execute({ timeslipId: "25", fields: { hours: "2.0" } }, ctx);
  assertEquals(calls[0].method, "PUT");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/timeslips/25");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { timeslip: { hours: "2.0" } });
});
