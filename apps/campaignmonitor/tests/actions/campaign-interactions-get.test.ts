import { assertEquals, assertRejects } from "@std/assert";
import campaignInteractionsGet, {
  CAMPAIGN_EVENTS,
} from "../../actions/campaign-interactions-get.ts";
import { API_PATH, mockCtx, pagedBody, pathOf, queryOf } from "../_helpers.ts";

/**
 * All five report paths, derived from the exported list rather than hand-typed,
 * so a sixth report added to the action is covered the moment it is added.
 */
Deno.test("campaign-interactions-get: every declared report maps to its own path", async () => {
  for (const event of CAMPAIGN_EVENTS) {
    const { ctx, calls } = mockCtx([{ body: pagedBody([]) }]);
    await campaignInteractionsGet.execute({ campaignId: "cmp", event }, ctx);
    assertEquals(pathOf(calls[0].url), `${API_PATH}/campaigns/cmp/${event}.json`);
  }
  assertEquals(CAMPAIGN_EVENTS.length, 5);
});

Deno.test("campaign-interactions-get: the select options are exactly the five report paths", () => {
  const options = (campaignInteractionsGet.params ?? [])
    .find((p) => p.key === "event")?.options as Array<{ value: string }>;
  assertEquals(options.map((o) => o.value).sort(), [...CAMPAIGN_EVENTS].sort());
});

Deno.test("campaign-interactions-get: defaults to opens", async () => {
  const { ctx, calls } = mockCtx([{ body: pagedBody([]) }]);
  await campaignInteractionsGet.execute({ campaignId: "cmp" }, ctx);
  assertEquals(pathOf(calls[0].url), `${API_PATH}/campaigns/cmp/opens.json`);
});

Deno.test("campaign-interactions-get: rejects an unknown report without a request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () =>
      await campaignInteractionsGet.execute({ campaignId: "cmp", event: "../summary" }, ctx),
    Error,
    "Report must be one of",
  );
  assertEquals(calls.length, 0);
});

/** Minute precision here, unlike the list endpoints' bare YYYY-MM-DD. */
Deno.test("campaign-interactions-get: passes a minute-precision date through verbatim", async () => {
  const { ctx, calls } = mockCtx([{ body: pagedBody([]) }]);
  await campaignInteractionsGet.execute({
    campaignId: "cmp",
    event: "clicks",
    date: "2026-01-31 09:30",
    pageSize: 200,
    orderField: "date",
    orderDirection: "desc",
  }, ctx);
  assertEquals(queryOf(calls[0].url), {
    date: "2026-01-31 09:30",
    pagesize: "200",
    orderfield: "date",
    orderdirection: "desc",
  });
});

Deno.test("campaign-interactions-get: returns the paged envelope with each report's extra fields", async () => {
  const click = {
    EmailAddress: "a@b.com",
    ListID: "l1",
    Date: "2026-01-31 09:31",
    URL: "https://example.com/x",
    IPAddress: "192.168.0.1",
  };
  const { ctx } = mockCtx([{ body: pagedBody([click]) }]);
  const out = await campaignInteractionsGet.execute({ campaignId: "cmp", event: "clicks" }, ctx);
  assertEquals(out.Results[0].URL, "https://example.com/x");
});
