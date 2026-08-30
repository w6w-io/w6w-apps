import { assertEquals } from "@std/assert";
import contactGet from "../../actions/contact-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-get: GETs /v1/contacts/{id}", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: { id: "c1" } } }]);
  await contactGet.execute({ id: "c1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/v1/contacts/c1");
});

Deno.test("contact-get: is a read action", () => {
  assertEquals(contactGet.type, "read");
});
