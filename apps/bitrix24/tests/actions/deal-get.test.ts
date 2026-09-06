import { assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/deal-get.ts";

const display = { portalUrl: "https://myportal.bitrix24.com" };

Deno.test("deal-get: fetches crm.deal.get with the numeric id", async () => {
  const { ctx, calls } = mockCtx([
    { status: 200, body: { result: { ID: "8", TITLE: "A Deal" }, time: {} } },
  ], { display });

  const out = await action.execute({ id: 8 }, ctx);

  assertEquals(calls[0].url, "https://myportal.bitrix24.com/rest/crm.deal.get");
  assertEquals(JSON.parse(calls[0].body!), { id: 8 });
  assertEquals(out, { ID: "8", TITLE: "A Deal" });
});

Deno.test("deal-get: rejects a non-numeric id before any network call", async () => {
  const { ctx, calls } = mockCtx([], { display });
  await assertRejects(async () => {
    await action.execute({ id: NaN }, ctx);
  });
  assertEquals(calls.length, 0);
});
