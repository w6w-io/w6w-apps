import { assertEquals } from "@std/assert";
import contactList from "../../actions/contact-list.ts";
import { listBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("contact-list: reads GET /v1/contacts", async () => {
  const { ctx, calls } = mockCtx([{ body: listBody("contacts", [{ id: 710 }]) }]);
  const out = await contactList.execute({}, ctx) as { items: unknown[] };

  assertEquals(pathOf(calls[0].url), "/v1/contacts");
  assertEquals(out.items.length, 1);
});

/**
 * `order_by` exists only on the two Contact endpoints and is what makes an
 * incremental "changed since" sync possible — sorting by `created_at` never
 * surfaces an edit.
 */
Deno.test("contact-list: orderBy reaches the wire as order_by", async () => {
  const { ctx, calls } = mockCtx([{ body: listBody("contacts", []) }]);
  await contactList.execute({ orderBy: "updated_at", order: "desc" }, ctx);
  const q = queryOf(calls[0].url);
  assertEquals(q.order_by, "updated_at");
  assertEquals(q.order, "desc");
});

Deno.test("contact-list: next_page_link drives hasMore", async () => {
  const { ctx } = mockCtx([
    {
      body: listBody("contacts", [{ id: 710 }], {
        next_page_link: "https://api.aircall.io/v1/contacts?page=2",
      }),
    },
  ]);
  const out = await contactList.execute({}, ctx) as { hasMore: boolean };
  assertEquals(out.hasMore, true);
});
