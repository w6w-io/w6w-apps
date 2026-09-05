import { assertEquals } from "@std/assert";
import leadUpdate from "../../actions/lead-update.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const REQUIRED = {
  leadId: 42,
  firstname: "Alex",
  email: "alex@example.com",
  leadSourceId: 10,
  assignTo: 5,
  country: "US",
};

Deno.test("lead-update: PUTs to /leads/{leadId}, leadId excluded from the body", async () => {
  const { ctx, calls } = mockCtx([{ body: { message: "ok" } }]);
  await leadUpdate.execute(REQUIRED, ctx);

  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), "/v1/api/leads/42");
  const body = JSON.parse(calls[0].body!);
  assertEquals("leadId" in body, false);
  assertEquals(body.firstname, "Alex");
});

/**
 * The vendor's own words: omitting an optional field on this PUT CLEARS it.
 * This action's `idempotent: true` is about retry safety with the SAME input,
 * not about this destructive-replace behaviour — pinned here so a reader does
 * not read idempotency as "safe to call with partial data".
 */
Deno.test("lead-update: is a full replace — pipelineId/stageId are optional, unlike lead-create", () => {
  const keys = new Set((leadUpdate.params ?? []).map((p) => p.key));
  assertEquals(keys.has("pipelineId"), true);
  const pipelineIdParam = leadUpdate.params?.find((p) => p.key === "pipelineId");
  assertEquals(pipelineIdParam?.required, undefined);
});

Deno.test("lead-update: is declared idempotent", () => {
  assertEquals(leadUpdate.idempotent, true);
});
