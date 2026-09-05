import { assertEquals } from "@std/assert";
import phoneNumberGet from "../../actions/phone-number-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("phone-number-get: hits GET /v2.1/phone-numbers/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 1234, current_status: "Available" }) }]);
  const out = await phoneNumberGet.execute({ id: 1234 }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v2.1/phone-numbers/1234");
  assertEquals(out.current_status, "Available");
});
