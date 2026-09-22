import { assertEquals } from "@std/assert";
import { mockInventoryCtx } from "../_helpers.ts";
import action from "../../actions/contact-list.ts";

Deno.test("contact-list: GETs /contacts with organization_id and pagination", async () => {
  const { ctx, calls } = mockInventoryCtx([
    {
      body: {
        code: 0,
        message: "success",
        contacts: [{ contact_id: "1" }],
        page_context: { page: 2, per_page: 25, has_more_page: false },
      },
    },
  ]);
  const out = await action.execute({ page: 2, per_page: 25 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/inventory/v1/contacts");
  assertEquals(url.searchParams.get("organization_id"), "10234695");
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("per_page"), "25");
  assertEquals(out.data, [{ contact_id: "1" }]);
  assertEquals(out.pageContext, { page: 2, per_page: 25, has_more_page: false });
});

/** No pass-through filters: `contact_type`/`search_text` never reach the URL. */
Deno.test("contact-list: sends no query parameters beyond organization and pagination", async () => {
  const { ctx, calls } = mockInventoryCtx([
    { body: { code: 0, message: "success", contacts: [] } },
  ]);
  await action.execute({}, ctx);
  const keys = [...new URL(calls[0].url).searchParams.keys()].sort();
  assertEquals(keys, ["organization_id"]);
});

Deno.test("contact-list: an explicit organizationId beats the connection default", async () => {
  const { ctx, calls } = mockInventoryCtx([
    { body: { code: 0, message: "success", contacts: [] } },
  ]);
  await action.execute({ organizationId: "222" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("organization_id"), "222");
});

Deno.test("contact-list: uses the connection's region host", async () => {
  const { ctx, calls } = mockInventoryCtx(
    [{ body: { code: 0, message: "success", contacts: [] } }],
    "www.zohoapis.com.au",
  );
  await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).host, "www.zohoapis.com.au");
});
