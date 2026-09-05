import { assertEquals } from "@std/assert";
import { mockCtx, pathOf, queryOf, TEST_DISPLAY } from "../_helpers.ts";
import action from "../../actions/booking-get-many.ts";

Deno.test("booking-get-many: GETs /admin/bookings with no filters by default", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], { display: TEST_DISPLAY });
  await action.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/admin/bookings");
  assertEquals(calls[0].method, "GET");
  const query = queryOf(calls[0].url);
  assertEquals(query["filter[upcoming_only]"], undefined);
  assertEquals(query["filter[status]"], undefined);
});

Deno.test("booking-get-many: builds every documented filter", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], { display: TEST_DISPLAY });
  await action.execute({
    page: 2,
    onPage: 10,
    upcomingOnly: true,
    status: "pending",
    date: "2026-09-05",
    dateFrom: "2026-09-01",
    dateTo: "2026-09-30",
    clientId: 7,
    serviceIds: [1, 2],
    providerIds: [3],
    search: "jane",
  }, ctx);

  const query = queryOf(calls[0].url);
  assertEquals(query.page, "2");
  assertEquals(query.on_page, "10");
  assertEquals(query["filter[upcoming_only]"], "1");
  assertEquals(query["filter[status]"], "pending");
  assertEquals(query["filter[date]"], "2026-09-05");
  assertEquals(query["filter[date_from]"], "2026-09-01");
  assertEquals(query["filter[date_to]"], "2026-09-30");
  assertEquals(query["filter[client_id]"], "7");
  assertEquals(query["filter[services]"], ["1", "2"]);
  assertEquals(query["filter[providers]"], ["3"]);
  assertEquals(query["filter[search]"], "jane");
});

Deno.test("booking-get-many: an empty select value omits the status filter", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], { display: TEST_DISPLAY });
  await action.execute({ status: "" }, ctx);
  assertEquals(queryOf(calls[0].url)["filter[status]"], undefined);
});
