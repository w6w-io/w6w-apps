import { assertEquals } from "@std/assert";
import donationList from "../../actions/donation-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("donation-list: hits /api/v1/donations", async () => {
  const { ctx, calls } = mockCtx([{ body: [{ id: 1, amount: "100.0" }] }]);
  const out = await donationList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v1/donations");
  assertEquals((out as { data: unknown[] }).data.length, 1);
});

Deno.test("donation-list: builds the currency-scoped amount[usd][min]/[max] query keys", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await donationList.execute({ amountMin: 10, amountMax: 500 }, ctx);
  const query = queryOf(calls[0].url);
  assertEquals(query["amount[usd][min]"], "10");
  assertEquals(query["amount[usd][max]"], "500");
});

Deno.test("donation-list: amountMin/amountMax may be used alone", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await donationList.execute({ amountMin: 10 }, ctx);
  const query = queryOf(calls[0].url);
  assertEquals(query["amount[usd][min]"], "10");
  assertEquals(query["amount[usd][max]"], undefined);
});

Deno.test("donation-list: a non-default currency changes the query key", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await donationList.execute({ amountCurrency: "eur", amountMin: 5 }, ctx);
  assertEquals(queryOf(calls[0].url)["amount[eur][min]"], "5");
});

Deno.test("donation-list: passes date_from/date_to through unchanged", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await donationList.execute({ date_from: "2026-01-01", date_to: "2026-12-31" }, ctx);
  const query = queryOf(calls[0].url);
  assertEquals(query.date_from, "2026-01-01");
  assertEquals(query.date_to, "2026-12-31");
});

Deno.test("donation-list: an unset filter is omitted from the query", async () => {
  const { ctx, calls } = mockCtx([{ body: [] }]);
  await donationList.execute({}, ctx);
  const query = queryOf(calls[0].url);
  assertEquals(query.email, undefined);
  assertEquals(query.campaign_id, undefined);
});
