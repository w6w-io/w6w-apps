import { assertEquals } from "@std/assert";
import contactGet from "../../actions/contact-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-get: GETs /contacts/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: 27074, firstName: "Charles" } }]);
  const out = await contactGet.execute({ id: 27074 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/contacts/27074");
  assertEquals(out, { id: 27074, firstName: "Charles" });
});
