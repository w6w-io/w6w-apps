import { assertEquals } from "@std/assert";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/lookup-number.ts";

Deno.test("lookup-number: GETs /lookup/{msisdn} with a stripped +", async () => {
  const body = {
    countryCode: "NL",
    countryPrefix: 31,
    phoneNumber: 31612345678,
    type: "mobile",
    formats: { e164: "+31612345678" },
  };
  const { ctx, calls } = mockCtx([{ body }]);

  const result = await action.execute!({ phoneNumber: "+31612345678" }, ctx);

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/lookup/31612345678");
  assertEquals(result, body);
});

Deno.test("lookup-number: passes countryCode as a query param when set", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ phoneNumber: "0612345678", countryCode: "NL" }, ctx);
  assertEquals(queryOf(calls[0].url), { countryCode: "NL" });
});

Deno.test("lookup-number: omits countryCode from the query when unset", async () => {
  const { ctx, calls } = mockCtx([{ body: {} }]);
  await action.execute!({ phoneNumber: "+31612345678" }, ctx);
  assertEquals(queryOf(calls[0].url), {});
});
