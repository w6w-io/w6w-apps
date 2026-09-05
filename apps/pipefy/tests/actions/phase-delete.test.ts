import { assert, assertEquals } from "@std/assert";
import { mockCtx, normalizeGql } from "../_helpers.ts";
import phaseDelete from "../../actions/phase-delete.ts";

Deno.test("phase-delete: deletes and returns success", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: { deletePhase: { success: true } } } }]);
  const out = await phaseDelete.execute({ id: "1" }, ctx) as { success: boolean };
  assertEquals(out.success, true);
  const q = normalizeGql(JSON.parse(calls[0].body!).query);
  assertEquals(q, "mutation { deletePhase(input: { id: 1 }) { success } }");
});

Deno.test("phase-delete: throws when success is false", async () => {
  const { ctx } = mockCtx([{ body: { data: { deletePhase: { success: false } } } }]);
  let threw = false;
  try {
    await phaseDelete.execute({ id: "1" }, ctx);
  } catch {
    threw = true;
  }
  assert(threw);
});

Deno.test("phase-delete: type/resource/idempotency metadata", () => {
  assertEquals(phaseDelete.type, "perform");
  assertEquals(phaseDelete.resource, "phase");
  assertEquals(phaseDelete.idempotent, true);
});
