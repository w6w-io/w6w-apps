import { assertEquals } from "@std/assert";
import contactList from "../../actions/contact-list.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-list: calls GET /api/contacts", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ id: 1, email: "john@example.com" }]) }]);
  const out = await contactList.execute({ page: 2 }, ctx) as { data: unknown[] };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/contacts");
  assertEquals(queryOf(calls[0].url), { page: "2" });
  assertEquals(out.data.length, 1);
});
