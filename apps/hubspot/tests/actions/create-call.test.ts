import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/create-call.ts";

Deno.test("create-call: POSTs /crm/v3/objects/calls with call-specific properties", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "call1" } }]);
  await action.execute!(
    { hs_call_title: "Kickoff", hs_call_direction: "OUTBOUND", hs_call_duration: 900 },
    ctx,
  );
  assertEquals(new URL(calls[0].url).pathname, "/crm/v3/objects/calls");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.properties.hs_call_title, "Kickoff");
  assertEquals(body.properties.hs_call_direction, "OUTBOUND");
  assertEquals(body.properties.hs_call_duration, "900");
});
