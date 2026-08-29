import { assertEquals } from "@std/assert";
import sourceUpdate from "../../actions/source-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("source-update: PUT with only provided fields", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "s1", type: "text", status: "updated" } }]);
  await sourceUpdate.execute({ agentId: "a1", sourceId: "s1", name: "New Name" }, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/api/v2/agents/a1/sources/s1");
  assertEquals(JSON.parse(calls[0].body!), { name: "New Name" });
});

Deno.test("source-update: parses questions as JSON and forwards answer", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "s1", status: "updated" } }]);
  await sourceUpdate.execute(
    { agentId: "a1", sourceId: "s1", questions: '["Q1"]', answer: "A1" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!), { questions: ["Q1"], answer: "A1" });
});
