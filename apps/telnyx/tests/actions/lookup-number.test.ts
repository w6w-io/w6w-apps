import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/lookup-number.ts";

Deno.test("lookup-number: GETs /number_lookup/{phone_number} and unwraps the data envelope", async () => {
  const data = { phone_number: "+13129457420", country_code: "US" };
  const { ctx, calls } = mockCtx([{ body: { data } }]);

  const result = await action.execute!({ phoneNumber: "+13129457420" }, ctx);

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v2/number_lookup/%2B13129457420");
  assertEquals(url.searchParams.get("type"), "carrier");
  assertEquals(result, data);
});

Deno.test("lookup-number: passes through the caller-name lookup type", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: {} } }]);
  await action.execute!({ phoneNumber: "+1", type: "caller-name" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("type"), "caller-name");
});
