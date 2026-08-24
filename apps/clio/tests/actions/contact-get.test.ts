import { assertEquals } from "@std/assert";
import contactGet from "../../actions/contact-get.ts";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-get: calls GET /contacts/{id}.json and unwraps data", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope({ id: 3, name: "Jane Doe" }) }]);
  const out = await contactGet.execute({ id: 3 }, ctx) as { name: string };
  assertEquals(pathOf(calls[0].url), "/api/v4/contacts/3.json");
  assertEquals(out.name, "Jane Doe");
});
