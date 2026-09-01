import { assertEquals } from "@std/assert";
import agentLaunch from "../../actions/agent-launch.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("agent-launch: POSTs to /agents/launch with the id and reports the real status", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);

  const out = await agentLaunch.execute({ id: "42" }, ctx) as Record<string, unknown>;

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/agents/launch");
  assertEquals(JSON.parse(calls[0].body!), { id: "42" });
  assertEquals(out.status, 200);
  assertEquals(out.response, undefined);
});

Deno.test("agent-launch: forwards optional launch fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);

  await agentLaunch.execute({
    id: "42",
    argument: { profileUrl: "https://linkedin.com/in/x" },
    saveArgument: true,
    manualLaunch: true,
    maxInstanceCount: 3,
  }, ctx);

  const body = JSON.parse(calls[0].body!);
  assertEquals(body.argument, { profileUrl: "https://linkedin.com/in/x" });
  assertEquals(body.saveArgument, true);
  assertEquals(body.manualLaunch, true);
  assertEquals(body.maxInstanceCount, 3);
});

Deno.test("agent-launch: is marked not idempotent — each call queues a new run", () => {
  assertEquals(agentLaunch.idempotent, false);
});

Deno.test("agent-launch: passes through whatever body the vendor actually sends", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { anything: "the vendor might send" } }]);
  const out = await agentLaunch.execute({ id: "42" }, ctx) as Record<string, unknown>;
  assertEquals(out.response, { anything: "the vendor might send" });
});
