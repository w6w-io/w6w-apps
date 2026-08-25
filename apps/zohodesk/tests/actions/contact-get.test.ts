import { assertEquals } from "@std/assert";
import { mockDeskCtx } from "../_helpers.ts";
import action from "../../actions/contact-get.ts";

Deno.test("contact-get: GETs /contacts/{id}", async () => {
  const { ctx, calls } = mockDeskCtx([{ body: { id: "7", lastName: "Carol" } }]);
  const out = await action.execute({ recordId: "7" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/api/v1/contacts/7");
  assertEquals(out, { id: "7", lastName: "Carol" });
});
