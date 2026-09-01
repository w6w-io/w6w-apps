import { assertEquals } from "@std/assert";
import contactGet from "../../actions/contact-get.ts";
import { dataEnvelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-get: fetches /v2/contacts/:id and unwraps data", async () => {
  const { ctx, calls } = mockCtx([{ body: dataEnvelope({ id: 2, name: "Mark Johnson" }) }]);
  const out = await contactGet.execute({ id: 2 }, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/v2/contacts/2");
  assertEquals(calls[0].method, "GET");
  assertEquals(out, { id: 2, name: "Mark Johnson" });
});
