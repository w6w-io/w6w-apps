import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-events.ts";

Deno.test("list-events: is a search action", () => {
  assertEquals(action.type, "search");
});

Deno.test("list-events: GETs /events with mapped filters", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { events: [] } }]);
  await action.execute({
    resourceId: 1,
    resourceType: "Contact",
    startDateMin: "2025-01-01",
    startDateMax: "2025-02-01",
    order: "asc",
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v1/events");
  assertEquals(url.searchParams.get("resource_id"), "1");
  assertEquals(url.searchParams.get("start_date_min"), "2025-01-01");
  assertEquals(url.searchParams.get("start_date_max"), "2025-02-01");
  assertEquals(url.searchParams.get("order"), "asc");
});
