import { assertEquals } from "@std/assert";
import bookingTypeList from "../../actions/booking-type-list.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("booking-type-list: calls GET /api/booking-types", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([{ id: 3, url_slug: "30-minute-meeting" }]) }]);
  const out = await bookingTypeList.execute({}, ctx) as { data: Array<{ id: number }> };

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/api/booking-types");
  assertEquals(out.data[0].id, 3);
});

/** `page` is the only pagination control TidyCal exposes — no limit, no offset. */
Deno.test("booking-type-list: page is the only query parameter it can send", async () => {
  const { ctx, calls } = mockCtx([{ body: envelope([]) }]);
  await bookingTypeList.execute({ page: 2 }, ctx);
  assertEquals(queryOf(calls[0].url), { page: "2" });
});
