import { assertEquals } from "@std/assert";
import agentStop from "../../actions/agent-stop.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("agent-stop: POSTs to /agents/stop with the id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);

  const out = await agentStop.execute({ id: "42" }, ctx) as Record<string, unknown>;

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/agents/stop");
  assertEquals(JSON.parse(calls[0].body!), { id: "42" });
  assertEquals(out.status, 200);
});

Deno.test("agent-stop: forwards the stop flags", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);

  await agentStop.execute({
    id: "42",
    softAbort: true,
    cascadeToAllSlaves: true,
    dontLaunchSoon: true,
    switchToManualLaunch: true,
  }, ctx);

  assertEquals(JSON.parse(calls[0].body!), {
    id: "42",
    softAbort: true,
    cascadeToAllSlaves: true,
    dontLaunchSoon: true,
    switchToManualLaunch: true,
  });
});

Deno.test("agent-stop: is marked idempotent — safe to retry", () => {
  assertEquals(agentStop.idempotent, true);
});
