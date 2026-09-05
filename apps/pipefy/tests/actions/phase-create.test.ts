import { assert, assertEquals } from "@std/assert";
import { mockCtx, normalizeGql } from "../_helpers.ts";
import phaseCreate from "../../actions/phase-create.ts";

Deno.test("phase-create: creates a phase and returns it", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { createPhase: { phase: { id: "1", name: "Review" } } } },
  }]);
  const out = await phaseCreate.execute({ pipeId: "123", name: "Review" }, ctx) as { id: string };
  assertEquals(out.id, "1");
  const q = normalizeGql(JSON.parse(calls[0].body!).query);
  assert(q.startsWith("mutation { createPhase(input:"));
  assert(q.includes("pipe_id: 123"));
  assert(q.includes('name: "Review"'));
});

Deno.test("phase-create: passes done/description when given", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { createPhase: { phase: { id: "1" } } } } }]);
  await phaseCreate.execute({ pipeId: "123", name: "Done", done: true, description: "final" }, ctx);
  const q = normalizeGql(JSON.parse(calls[0].body!).query);
  assert(q.includes("done: true"));
  assert(q.includes('description: "final"'));
});

Deno.test("phase-create: type/resource/idempotency metadata", () => {
  assertEquals(phaseCreate.type, "perform");
  assertEquals(phaseCreate.resource, "phase");
  assertEquals(phaseCreate.idempotent, false);
});
