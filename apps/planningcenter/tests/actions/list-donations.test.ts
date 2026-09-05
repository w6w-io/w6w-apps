import { assertEquals } from "@std/assert";
import listDonations from "../../actions/list-donations.ts";
import { collection, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-donations: calls GET /giving/v2/donations and keeps amounts in cents", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: collection("Donation", [
        {
          id: "1",
          attributes: {
            amount_cents: 5000,
            amount_currency: "USD",
            received_at: "2026-01-05T00:00:00Z",
          },
          relationships: { person: { data: { type: "Person", id: "7" } } },
        },
      ]),
    },
  ]);
  const out = await listDonations.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), "/giving/v2/donations");
  assertEquals(out.donations[0].amountCents, 5000);
  assertEquals(out.donations[0].amountCurrency, "USD");
  assertEquals(out.donations[0].personId, "7");
});

Deno.test("list-donations: a date range renders as nested where[received_at][gte/lte]", async () => {
  const { ctx, calls } = mockCtx([{ body: collection("Donation", []) }]);
  await listDonations.execute({ receivedAtGte: "2026-01-01", receivedAtLte: "2026-01-31" }, ctx);

  const q = queryOf(calls[0].url);
  assertEquals(q["where[received_at][gte]"], "2026-01-01");
  assertEquals(q["where[received_at][lte]"], "2026-01-31");
});

Deno.test("list-donations: fundId maps to where[fund_id]", async () => {
  const { ctx, calls } = mockCtx([{ body: collection("Donation", []) }]);
  await listDonations.execute({ fundId: "fund_1" }, ctx);

  assertEquals(queryOf(calls[0].url)["where[fund_id]"], "fund_1");
});
