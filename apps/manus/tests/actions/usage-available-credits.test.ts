import { assertEquals } from "@std/assert";
import usageAvailableCredits from "../../actions/usage-available-credits.ts";
import { mockCtx, okBody, pathOf } from "../_helpers.ts";

Deno.test("usage-available-credits: gets /v2/usage.availableCredits and returns data unwrapped", async () => {
  const { ctx, calls } = mockCtx([{ body: okBody({ data: { total_credits: 500 } }) }]);
  const out = await usageAvailableCredits.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/usage.availableCredits");
  assertEquals(out, { total_credits: 500 });
});
