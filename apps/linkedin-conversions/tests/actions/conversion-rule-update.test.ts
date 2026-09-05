import { assertEquals, assertRejects } from "@std/assert";
import conversionRuleUpdate from "../../actions/conversion-rule-update.ts";
import { mockCtx, noContentResponse, pathOf, queryOf } from "../_helpers.ts";

Deno.test("conversion-rule-update: a PARTIAL_UPDATE $set patch, account URN in the query", async () => {
  const { ctx, calls } = mockCtx([noContentResponse()]);
  const result = await conversionRuleUpdate.execute(
    { conversionId: "104012", accountId: "519072844", enabled: false },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/rest/conversions/104012");
  assertEquals(calls[0].headers["x-restli-method"], "PARTIAL_UPDATE");
  assertEquals(queryOf(calls[0].url).account, "urn:li:sponsoredAccount:519072844");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body, { patch: { $set: { enabled: false } } });
  assertEquals(result, { ok: true });
});

Deno.test("conversion-rule-update: only the fields set are included in $set", async () => {
  const { ctx, calls } = mockCtx([noContentResponse()]);
  await conversionRuleUpdate.execute(
    { conversionId: "1", accountId: "1", name: "New name", postClickAttributionWindowSize: 90 },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.patch.$set, { name: "New name", postClickAttributionWindowSize: 90 });
});

Deno.test("conversion-rule-update: rejects when nothing is set, without making a request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await conversionRuleUpdate.execute({ conversionId: "1", accountId: "1" }, ctx),
    Error,
    "Set at least one of",
  );
  assertEquals(calls.length, 0);
});

Deno.test("conversion-rule-update: is idempotent", () => {
  assertEquals(conversionRuleUpdate.idempotent, true);
});
