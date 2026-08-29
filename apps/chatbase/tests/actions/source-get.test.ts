import { assertEquals } from "@std/assert";
import sourceGet from "../../actions/source-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("source-get: GET .../sources/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "s1", type: "text", status: "trained" } }]);
  const out = await sourceGet.execute({ agentId: "a1", sourceId: "s1" }, ctx) as { status: string };

  assertEquals(pathOf(calls[0].url), "/api/v2/agents/a1/sources/s1");
  assertEquals(out.status, "trained");
});
