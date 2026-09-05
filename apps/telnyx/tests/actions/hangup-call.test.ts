import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/hangup-call.ts";

Deno.test("hangup-call: POSTs to /calls/{id}/actions/hangup and unwraps the result", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { result: "ok" } } }]);

  const result = await action.execute!({ callControlId: "v3:abc" }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "POST");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/calls/v3%3Aabc/actions/hangup");
  assertEquals(result, { result: "ok" });
});

Deno.test("hangup-call: URL-encodes the call_control_id and sends optional client_state/command_id", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { result: "ok" } } }]);
  await action.execute!(
    { callControlId: "v3:abc", clientState: "c3RhdGU=", commandId: "cmd-1" },
    ctx,
  );
  const body = JSON.parse(calls[0].body ?? "{}");
  assertEquals(body.client_state, "c3RhdGU=");
  assertEquals(body.command_id, "cmd-1");
});

Deno.test("hangup-call: is declared idempotent", () => {
  const { idempotent } = action;
  assertEquals(idempotent, true);
});
