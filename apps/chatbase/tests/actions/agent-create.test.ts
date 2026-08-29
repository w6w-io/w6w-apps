import { assertEquals } from "@std/assert";
import agentCreate from "../../actions/agent-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("agent-create: POST /agents with only provided fields", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "a1" } }]);
  const out = await agentCreate.execute({ name: "Support Bot" }, ctx) as { id: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/api/v2/agents");
  assertEquals(JSON.parse(calls[0].body!), { name: "Support Bot" });
  assertEquals(out.id, "a1");
});

Deno.test("agent-create: forwards url, model, temp, visibility when given", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: { id: "a1" } }]);
  await agentCreate.execute({
    name: "Support Bot",
    url: "https://example.com",
    model: "gpt-5.6-terra",
    temp: 0.5,
    visibility: "public",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!), {
    name: "Support Bot",
    url: "https://example.com",
    model: "gpt-5.6-terra",
    temp: 0.5,
    visibility: "public",
  });
});

Deno.test("agent-create: surfaces pendingSteps when the response reports one", async () => {
  const { ctx } = mockCtx([{ status: 201, body: { id: "a1", pendingSteps: ["ADD_SOURCE"] } }]);
  const out = await agentCreate.execute({ name: "Bot", url: "bad" }, ctx) as {
    pendingSteps?: string[];
  };
  assertEquals(out.pendingSteps, ["ADD_SOURCE"]);
});
