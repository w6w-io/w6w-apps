import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/lead-list.ts";

const conn = { display: { accountDomain: "acme.kommo.com" } };

Deno.test("lead-list: GETs /leads with page and limit", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { _embedded: { leads: [{ id: 1 }] } } }],
    conn,
  );
  const out = await action.execute!({ page: 2, limit: 10 }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://acme.kommo.com/api/v4/leads?page=2&limit=10");
  assertEquals(out.leads, [{ id: 1 }]);
  assertEquals(out.page, 2);
});

Deno.test("lead-list: joins withEmbed and applies id/responsible filters", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { _embedded: { leads: [] } } }],
    conn,
  );
  await action.execute!(
    { withEmbed: ["contacts", "loss_reason"], ids: "1, 2", responsibleUserId: 9 },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("with"), "contacts,loss_reason");
  assertEquals(url.searchParams.getAll("filter[id][]"), ["1", "2"]);
  assertEquals(url.searchParams.getAll("filter[responsible_user_id][]"), ["9"]);
});

Deno.test("lead-list: orderBy adds order[<field>]=<direction> only when set", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { _embedded: { leads: [] } } }],
    conn,
  );
  await action.execute!({ orderBy: "created_at", orderDirection: "asc" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("order[created_at]"), "asc");
});

Deno.test("lead-list: hasMore is true only when the page is exactly full", async () => {
  const full = mockCtx(
    [{ status: 200, body: { _embedded: { leads: [{ id: 1 }, { id: 2 }] } } }],
    conn,
  );
  assertEquals((await action.execute!({ limit: 2 }, full.ctx)).hasMore, true);

  const short = mockCtx(
    [{ status: 200, body: { _embedded: { leads: [{ id: 1 }] } } }],
    conn,
  );
  assertEquals((await action.execute!({ limit: 2 }, short.ctx)).hasMore, false);
});

Deno.test("lead-list: type is search, and resource is lead", () => {
  assertEquals(action.type, "search");
  assertEquals(action.resource, "lead");
});
