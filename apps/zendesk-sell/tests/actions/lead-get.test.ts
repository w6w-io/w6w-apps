import { assertEquals } from "@std/assert";
import leadGet from "../../actions/lead-get.ts";
import { dataEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("lead-get: fetches /v2/leads/:id", async () => {
  const { ctx, calls } = mockCtx([{ body: dataEnvelope({ id: 1, status: "New" }) }]);
  const out = await leadGet.execute({ id: 1 }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v2/leads/1");
  assertEquals(out.status, "New");
});
