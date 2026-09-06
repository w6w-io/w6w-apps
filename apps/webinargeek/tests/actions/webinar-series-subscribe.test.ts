import { assertEquals } from "@std/assert";
import webinarSeriesSubscribe from "../../actions/webinar-series-subscribe.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("webinar-series-subscribe: POSTs to /webinars/{id}/series_subscribe with a translated body", async () => {
  const { ctx, calls } = mockCtx([
    { status: 201, body: { total_count: 1, subscriptions: [{ id: 1 }] } },
  ]);
  const out = await webinarSeriesSubscribe.execute({
    webinarId: 1,
    firstname: "John",
    email: "john@smith.com",
    jobTitle: "Sales Manager",
    houseNumber: "12",
    broadcasts: [12, 15],
  }, ctx) as { subscriptions: unknown[] };

  assertEquals(pathOf(calls[0].url), "/api/v2/webinars/1/series_subscribe");
  assertEquals(calls[0].method, "POST");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.firstname, "John");
  assertEquals(body.job_title, "Sales Manager");
  assertEquals(body.house_number, "12");
  assertEquals(body.broadcasts, [12, 15]);
  assertEquals(out.subscriptions, [{ id: 1 }]);
});

Deno.test("webinar-series-subscribe: is declared idempotent (documented silent-skip on re-subscribe)", () => {
  assertEquals(webinarSeriesSubscribe.idempotent, true);
});
