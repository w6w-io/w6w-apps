import { assertEquals } from "@std/assert";
import { mockFreshsalesCtx } from "../_helpers.ts";
import action from "../../actions/contact-get-many.ts";

Deno.test("contact-get-many: GETs the view path, not a flat /contacts", async () => {
  const { ctx, calls } = mockFreshsalesCtx([{
    body: { contacts: [{ id: 1 }], meta: { total: 1 } },
  }]);
  const out = await action.execute({ viewId: 4 }, ctx);
  assertEquals(calls[0].url, "https://acme.myfreshworks.com/crm/sales/api/contacts/view/4");
  assertEquals(out, { contacts: [{ id: 1 }], total: 1 });
});

Deno.test("contact-get-many: forwards page/perPage and sort/sortType", async () => {
  const { ctx, calls } = mockFreshsalesCtx([{ body: { contacts: [], meta: { total: 0 } } }]);
  await action.execute({ viewId: 4, page: 2, perPage: 50, sort: "created_at" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("page"), "2");
  assertEquals(url.searchParams.get("per_page"), "50");
  assertEquals(url.searchParams.get("sort"), "created_at");
  assertEquals(url.searchParams.get("sort_type"), "desc");
});

Deno.test("contact-get-many: omits sort_type entirely when no sort field is chosen", async () => {
  const { ctx, calls } = mockFreshsalesCtx([{ body: { contacts: [], meta: { total: 0 } } }]);
  await action.execute({ viewId: 4 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.has("sort"), false);
  assertEquals(url.searchParams.has("sort_type"), false);
});
