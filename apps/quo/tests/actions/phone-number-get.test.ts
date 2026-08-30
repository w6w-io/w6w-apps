import { assertEquals } from "@std/assert";
import phoneNumberGet from "../../actions/phone-number-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("phone-number-get: GETs /v1/phone-numbers/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: "PN1" } } }]);
  const out = await phoneNumberGet.execute({ phoneNumberId: "PN1" }, ctx) as {
    data: { id: string };
  };
  assertEquals(pathOf(calls[0].url), "/v1/phone-numbers/PN1");
  assertEquals(out.data.id, "PN1");
});

Deno.test("phone-number-get: is a read action", () => {
  assertEquals(phoneNumberGet.type, "read");
});
