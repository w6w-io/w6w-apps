import { assertEquals } from "@std/assert";
import numberGet from "../../actions/number-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("number-get: fetches by phone number and maps fields", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      phone_number: "+18584139939",
      prompt: "Hello",
      webhook: "https://example.com/hook",
      pathway_id: "p-1",
      max_duration: 30,
      fallback_number: null,
    },
  }]);
  const out = await numberGet.execute({ phoneNumber: "+18584139939" }, ctx) as Record<
    string,
    unknown
  >;
  assertEquals(pathOf(calls[0].url), "/v1/inbound/%2B18584139939");
  assertEquals(out.phoneNumber, "+18584139939");
  assertEquals(out.prompt, "Hello");
  assertEquals(out.maxDuration, 30);
});
