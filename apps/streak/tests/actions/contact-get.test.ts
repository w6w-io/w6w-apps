import { assertEquals } from "@std/assert";
import contactGet from "../../actions/contact-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-get: calls GET /contacts/{contactKey}", async () => {
  const { ctx, calls } = mockCtx([{ body: { key: "c1" } }]);
  await contactGet.execute({ contactKey: "c1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/contacts/c1");
});
