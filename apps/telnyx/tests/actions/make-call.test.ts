import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/make-call.ts";

Deno.test("make-call: POSTs JSON to /calls including the required connection_id", async () => {
  const data = { call_control_id: "v3:abc", call_leg_id: "leg1", call_session_id: "sess1" };
  const { ctx, calls } = mockCtx([{ body: { data } }]);

  const result = await action.execute!(
    { connectionId: "conn1", from: "+1", to: "+2" },
    ctx,
  );

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/calls");

  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body.connection_id, "conn1");
  assertEquals(body.from, "+1");
  assertEquals(body.to, "+2");

  assertEquals(result, data);
});

Deno.test("make-call: passes through optional fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute!(
    {
      connectionId: "conn1",
      from: "+1",
      to: "+2",
      fromDisplayName: "Acme",
      timeoutSecs: 30,
      timeLimitSecs: 120,
      webhookUrl: "https://example.com/hook",
      clientState: "c3RhdGU=",
      commandId: "cmd-1",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body.from_display_name, "Acme");
  assertEquals(body.timeout_secs, 30);
  assertEquals(body.time_limit_secs, 120);
  assertEquals(body.webhook_url, "https://example.com/hook");
  assertEquals(body.client_state, "c3RhdGU=");
  assertEquals(body.command_id, "cmd-1");
});

Deno.test("make-call: omits unset optional fields rather than sending null", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute!({ connectionId: "conn1", from: "+1", to: "+2" }, ctx);
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals("from_display_name" in body, false);
  assertEquals("timeout_secs" in body, false);
});
