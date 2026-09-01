import { assertEquals, assertRejects } from "@std/assert";
import dealUpsert from "../../actions/deal-upsert.ts";
import { dataEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("deal-upsert: posts to /v2/deals/upsert with the filter in the query", async () => {
  const { ctx, calls } = mockCtx([{ body: dataEnvelope({ id: 1 }) }]);
  await dealUpsert.execute({ filterContactId: 1, name: "Website Redesign for Coffeeshop" }, ctx);

  assertEquals(pathOf(calls[0].url), "/v2/deals/upsert");
  assertEquals(queryOf(calls[0].url), { contact_id: "1" });
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.data.name, "Website Redesign for Coffeeshop");
});

Deno.test("deal-upsert: refuses to run with no filter", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await dealUpsert.execute({ name: "x" }, ctx),
    Error,
    "at least one filter",
  );
  assertEquals(calls.length, 0);
});
