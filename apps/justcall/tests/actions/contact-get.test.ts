import { assertEquals } from "@std/assert";
import contactGet from "../../actions/contact-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-get: hits GET /v2.1/contacts/{id} and unwraps a bare object", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 1234, name: "Rachel Green" }) }]);
  const out = await contactGet.execute({ id: 1234 }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v2.1/contacts/1234");
  assertEquals(out.name, "Rachel Green");
});
