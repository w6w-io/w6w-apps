import { assertEquals } from "@std/assert";
import { mockInvoiceCtx } from "../_helpers.ts";
import action from "../../actions/contact-list.ts";

Deno.test("contact-list: GETs /contacts, unwraps the plural key, and passes filters through", async () => {
  const { ctx, calls } = mockInvoiceCtx([
    {
      body: {
        code: 0,
        message: "success",
        contacts: [{ contact_id: "1" }],
        page_context: { page: 1, per_page: 200, has_more_page: false },
      },
    },
  ]);
  const out = await action.execute({ filterBy: "Status.Active", searchText: "Acme" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/invoice/v3/contacts");
  assertEquals(url.searchParams.get("filter_by"), "Status.Active");
  assertEquals(url.searchParams.get("search_text"), "Acme");
  assertEquals(out.data, [{ contact_id: "1" }]);
  assertEquals(out.pageContext?.has_more_page, false);
});

Deno.test("contact-list: falls back to the connection's organization id", async () => {
  const { ctx, calls } = mockInvoiceCtx([
    { body: { code: 0, message: "success", contacts: [] } },
  ]);
  await action.execute({}, ctx);
  assertEquals(calls[0].headers["x-com-zoho-invoice-organizationid"], "10234695");
});
