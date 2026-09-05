import { assertEquals } from "@std/assert";
import contactDelete from "../../actions/contact-delete.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-delete: DELETEs /v2.1/contacts, addressed by query params", async () => {
  const { ctx, calls } = mockCtx([{ body: { status: "success" } }]);
  const out = await contactDelete.execute({ id: 1234, across_team: true }, ctx) as Record<
    string,
    unknown
  >;

  assertEquals(pathOf(calls[0].url), "/v2.1/contacts");
  assertEquals(calls[0].method, "DELETE");
  assertEquals(queryOf(calls[0].url), { id: "1234", across_team: "true" });
  assertEquals(out, { status: "success" });
});
