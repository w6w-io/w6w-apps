import { assertEquals } from "@std/assert";
import { mockBooksCtx } from "../_helpers.ts";
import action from "../../actions/organization-list.ts";

Deno.test("organization-list: GETs /organizations with no organization_id query param", async () => {
  const { ctx, calls } = mockBooksCtx([
    { body: { code: 0, message: "success", organizations: [{ organization_id: "10234695" }] } },
  ]);
  const out = await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/books/v3/organizations");
  assertEquals(url.searchParams.has("organization_id"), false);
  assertEquals(out, { organizations: [{ organization_id: "10234695" }] });
});
