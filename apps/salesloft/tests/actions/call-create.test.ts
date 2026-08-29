import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/call-create.ts";

Deno.test("call-create: POSTs /activities/calls with a JSON body", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { id: 1 } } }]);
  const result = await action.execute!(
    { personId: 4, to: "+15551234567", duration: 90, disposition: "Connected" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/activities/calls");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.person_id, 4);
  assertEquals(body.to, "+15551234567");
  assertEquals(body.duration, 90);
  assertEquals(body.disposition, "Connected");
  assertEquals(result, { data: { id: 1 } });
});
