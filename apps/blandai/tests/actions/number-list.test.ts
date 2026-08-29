import { assertEquals } from "@std/assert";
import numberList from "../../actions/number-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("number-list: fetches /v1/inbound and unwraps inbound_numbers", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { inbound_numbers: [{ phone_number: "+18005551234" }] },
  }]);
  const out = await numberList.execute({}, ctx) as Record<string, unknown>;
  assertEquals(pathOf(calls[0].url), "/v1/inbound");
  assertEquals(out.numbers, [{ phone_number: "+18005551234" }]);
});

Deno.test("number-list: defaults to an empty array", async () => {
  const { ctx } = mockCtx([{ status: 200, body: {} }]);
  const out = await numberList.execute({}, ctx) as Record<string, unknown>;
  assertEquals(out.numbers, []);
});
