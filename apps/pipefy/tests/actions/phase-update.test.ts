import { assert, assertEquals } from "@std/assert";
import { mockCtx, normalizeGql } from "../_helpers.ts";
import phaseUpdate from "../../actions/phase-update.ts";

Deno.test("phase-update: updates and returns the phase, color as a bare enum", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { updatePhase: { phase: { id: "1", name: "Phase", color: "lime" } } } },
  }]);
  const out = await phaseUpdate.execute({ id: "1", name: "Phase", color: "lime" }, ctx) as {
    name: string;
  };
  assertEquals(out.name, "Phase");
  const q = normalizeGql(JSON.parse(calls[0].body!).query);
  assert(q.includes("color: lime"));
  assert(!q.includes('color: "lime"'));
});

Deno.test("phase-update: type/resource/idempotency metadata", () => {
  assertEquals(phaseUpdate.type, "perform");
  assertEquals(phaseUpdate.resource, "phase");
  assertEquals(phaseUpdate.idempotent, true);
});
