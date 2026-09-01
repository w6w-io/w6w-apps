import { assertEquals } from "@std/assert";
import { mockDripCtx } from "../_helpers.ts";
import action from "../../actions/list-subscribers.ts";

Deno.test("list-subscribers: GETs /subscribers with no query params by default", async () => {
  const { ctx, calls } = mockDripCtx([{ body: { subscribers: [], meta: { total_count: 0 } } }]);
  const out = await action.execute({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/1234567/subscribers");
  assertEquals([...url.searchParams.keys()], []);
  assertEquals(out, { subscribers: [], totalCount: 0 });
});

Deno.test("list-subscribers: forwards status, tags, date filters, and pagination", async () => {
  const { ctx, calls } = mockDripCtx([{ body: { subscribers: [] } }]);
  await action.execute(
    {
      status: "active",
      tags: "Customer,SEO",
      subscribedBefore: "2017-01-01T00:00:00Z",
      subscribedAfter: "2016-01-01T00:00:00Z",
      page: 2,
      perPage: 50,
    },
    ctx,
  );
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("status"), "active");
  assertEquals(p.get("tags"), "Customer,SEO");
  assertEquals(p.get("subscribed_before"), "2017-01-01T00:00:00Z");
  assertEquals(p.get("subscribed_after"), "2016-01-01T00:00:00Z");
  assertEquals(p.get("page"), "2");
  assertEquals(p.get("per_page"), "50");
});
