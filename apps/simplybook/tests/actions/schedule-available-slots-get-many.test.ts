import { assertEquals } from "@std/assert";
import { mockCtx, pathOf, queryOf, TEST_DISPLAY } from "../_helpers.ts";
import action from "../../actions/schedule-available-slots-get-many.ts";

Deno.test("schedule-available-slots-get-many: GETs with the four required params", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ date: "2026-09-05", time: "11:00" }] }], {
    display: TEST_DISPLAY,
  });
  const result = await action.execute({
    serviceId: 7,
    providerId: 3,
    date: "2026-09-05",
  }, ctx);

  assertEquals(pathOf(calls[0].url), "/admin/schedule/available-slots");
  const query = queryOf(calls[0].url);
  assertEquals(query.service_id, "7");
  assertEquals(query.provider_id, "3");
  assertEquals(query.date, "2026-09-05");
  assertEquals(query.count, "1");
  assertEquals(result, [{ date: "2026-09-05", time: "11:00" }]);
});

Deno.test("schedule-available-slots-get-many: an explicit count overrides the default of 1", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], { display: TEST_DISPLAY });
  await action.execute({ serviceId: 7, providerId: 3, date: "2026-09-05", count: 4 }, ctx);
  assertEquals(queryOf(calls[0].url).count, "4");
});

Deno.test("schedule-available-slots-get-many: serializes product ids", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }], { display: TEST_DISPLAY });
  await action.execute({
    serviceId: 7,
    providerId: 3,
    date: "2026-09-05",
    productIds: [1, 2],
  }, ctx);
  assertEquals(queryOf(calls[0].url).products, ["1", "2"]);
});
