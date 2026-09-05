import { assertEquals } from "@std/assert";
import usageEventsList from "../../actions/usage-events-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("usage-events-list: posts filters to /teams/filtered-usage-events", async () => {
  const { ctx, calls } = mockCtx([
    { body: { totalUsageEventsCount: 0, pagination: {}, usageEvents: [], period: {} } },
  ]);
  await usageEventsList.execute({
    startDate: 1748411762359,
    endDate: 1751003762359,
    serviceAccountId: "sa_abc123",
    page: 1,
    pageSize: 10,
  }, ctx);
  assertEquals(pathOf(calls[0].url), "/teams/filtered-usage-events");
  assertEquals(
    JSON.parse(calls[0].body!),
    {
      startDate: 1748411762359,
      endDate: 1751003762359,
      serviceAccountId: "sa_abc123",
      page: 1,
      pageSize: 10,
    },
  );
});

Deno.test("usage-events-list: passes hostingType through verbatim, undocumented values included", async () => {
  const { ctx, calls } = mockCtx([
    { body: { totalUsageEventsCount: 0, pagination: {}, usageEvents: [], period: {} } },
  ]);
  await usageEventsList.execute({
    startDate: 1,
    endDate: 2,
    hostingType: "SELF_HOSTED",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).hostingType, "SELF_HOSTED");
});
