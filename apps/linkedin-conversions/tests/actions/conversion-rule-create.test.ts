import { assertEquals } from "@std/assert";
import conversionRuleCreate from "../../actions/conversion-rule-create.ts";
import { createdResponse, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("conversion-rule-create: a plain single POST, account URN built from accountId, conversionMethod pinned", async () => {
  const { ctx, calls } = mockCtx([createdResponse("104012")]);
  const result = await conversionRuleCreate.execute(
    { accountId: "5123456", name: "Conversion API Segment 1", type: "LEAD" },
    ctx,
  );

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/rest/conversions");
  assertEquals(calls[0].headers["x-restli-method"], undefined);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.account, "urn:li:sponsoredAccount:5123456");
  assertEquals(body.name, "Conversion API Segment 1");
  assertEquals(body.conversionMethod, "CONVERSIONS_API");
  assertEquals(body.type, "LEAD");
  assertEquals(result, { id: "104012" });
});

Deno.test("conversion-rule-create: includes optional attribution/window/valueType fields when set", async () => {
  const { ctx, calls } = mockCtx([createdResponse("1")]);
  await conversionRuleCreate.execute(
    {
      accountId: "1",
      name: "N",
      type: "PURCHASE",
      enabled: false,
      attributionType: "LAST_TOUCH_BY_CONVERSION",
      postClickAttributionWindowSize: 90,
      viewThroughAttributionWindowSize: 30,
      valueType: "FIXED",
    },
    ctx,
  );
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.enabled, false);
  assertEquals(body.attributionType, "LAST_TOUCH_BY_CONVERSION");
  assertEquals(body.postClickAttributionWindowSize, 90);
  assertEquals(body.viewThroughAttributionWindowSize, 30);
  assertEquals(body.valueType, "FIXED");
});

Deno.test("conversion-rule-create: passes autoAssociationType through as a query parameter", async () => {
  const { ctx, calls } = mockCtx([createdResponse("1")]);
  await conversionRuleCreate.execute(
    { accountId: "1", name: "N", type: "LEAD", autoAssociationType: "ALL_CAMPAIGNS" },
    ctx,
  );
  assertEquals(queryOf(calls[0].url).autoAssociationType, "ALL_CAMPAIGNS");
});

Deno.test("conversion-rule-create: omits autoAssociationType from the query when unset", async () => {
  const { ctx, calls } = mockCtx([createdResponse("1")]);
  await conversionRuleCreate.execute({ accountId: "1", name: "N", type: "LEAD" }, ctx);
  assertEquals("autoAssociationType" in queryOf(calls[0].url), false);
});

Deno.test("conversion-rule-create: is not idempotent", () => {
  assertEquals(conversionRuleCreate.idempotent, false);
});
