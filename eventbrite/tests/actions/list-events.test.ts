import { assert, assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-events.ts";

Deno.test("list-events: applies defaults (status=live, page_size=100, expand=venue,ticket_classes)", async () => {
  const body = { events: [], pagination: {} };
  const { ctx, calls } = mockCtx([{ body }]);
  await action.execute!({ organizationId: "acct-1" }, ctx);

  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/organizations/acct-1/events/");
  assertEquals(url.searchParams.get("status"), "live");
  assertEquals(url.searchParams.get("page_size"), "100");
  assertEquals(url.searchParams.get("expand"), "venue,ticket_classes");
});

Deno.test("list-events: forwards all optional filters when provided", async () => {
  const { ctx, calls } = mockCtx([{ body: { events: [], pagination: {} } }]);
  await action.execute!(
    {
      organizationId: "acct-1",
      status: "live,draft",
      nameFilter: "party",
      timeFilter: "past",
      showSeriesParent: true,
      pageSize: 25,
      continuation: "cont-tok",
      expand: "logo",
    },
    ctx,
  );
  const params = new URL(calls[0].url).searchParams;
  assertEquals(params.get("status"), "live,draft");
  assertEquals(params.get("name_filter"), "party");
  assertEquals(params.get("time_filter"), "past");
  assertEquals(params.get("show_series_parent"), "true");
  assertEquals(params.get("page_size"), "25");
  assertEquals(params.get("continuation"), "cont-tok");
  assertEquals(params.get("expand"), "logo");
});

Deno.test("list-events: omits undefined optional filters", async () => {
  const { ctx, calls } = mockCtx([{ body: { events: [], pagination: {} } }]);
  await action.execute!({ organizationId: "acct-1" }, ctx);
  const params = new URL(calls[0].url).searchParams;
  assert(!params.has("name_filter"));
  assert(!params.has("time_filter"));
  assert(!params.has("continuation"));
});
