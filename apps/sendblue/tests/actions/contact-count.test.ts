import { assertEquals } from "@std/assert";
import contactCount from "../../actions/contact-count.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("contact-count: GETs /api/v2/contacts/count with no params", async () => {
  const { ctx, calls } = mockCtx([{ body: { count: 42 } }]);
  const out = await contactCount.execute({}, ctx) as Record<string, unknown>;

  assertEquals(pathOf(calls[0].url), "/api/v2/contacts/count");
  assertEquals(out.count, 42);
});

Deno.test("contact-count: takes no parameters, so it is safe to invoke with {}", () => {
  assertEquals(contactCount.params?.length, 0);
});
