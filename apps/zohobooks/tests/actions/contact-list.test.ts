import { assertEquals } from "@std/assert";
import { mockBooksCtx } from "../_helpers.ts";
import action from "../../actions/contact-list.ts";

Deno.test("contact-list: GETs /contacts with organization_id and filters", async () => {
  const { ctx, calls } = mockBooksCtx([
    {
      body: {
        code: 0,
        message: "success",
        contacts: [{ contact_id: "1" }],
        page_context: { page: 1 },
      },
    },
  ]);
  const out = await action.execute({ contactType: "customer", searchText: "acme" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/books/v3/contacts");
  assertEquals(url.searchParams.get("organization_id"), "10234695");
  assertEquals(url.searchParams.get("contact_type"), "customer");
  assertEquals(url.searchParams.get("search_text"), "acme");
  assertEquals(out.data, [{ contact_id: "1" }]);
  assertEquals(out.pageContext, { page: 1 });
});
