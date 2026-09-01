import { assertEquals, assertRejects } from "@std/assert";
import agentDelete from "../../actions/agent-delete.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("agent-delete: POSTs to /agents/delete with the id", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: undefined }]);

  const out = await agentDelete.execute({ id: "42" }, ctx) as Record<string, unknown>;

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/agents/delete");
  assertEquals(JSON.parse(calls[0].body!), { id: "42" });
  assertEquals(out.status, 200);
});

Deno.test("agent-delete: is marked idempotent — a repeat delete is safe to retry", () => {
  assertEquals(agentDelete.idempotent, true);
});

Deno.test("agent-delete: a running-agent 403 surfaces as an error, not a status", async () => {
  const { ctx } = mockCtx([{
    status: 403,
    body: { status: "error", error: "Agent is currently running and could not be deleted." },
  }]);
  const err = await assertRejects(
    () => Promise.resolve(agentDelete.execute({ id: "42" }, ctx)),
    Error,
  );
  assertEquals(err.message.includes("currently running"), true, err.message);
});
