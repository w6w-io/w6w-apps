import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/contact-get.ts";

Deno.test("contact-get: GETs /contacts/{id}", async () => {
  const { ctx, calls } = mockCtx([{ body: { id: "CTC-1" } }]);
  await action.execute({ id: "CTC-1" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/contacts/CTC-1");
});
