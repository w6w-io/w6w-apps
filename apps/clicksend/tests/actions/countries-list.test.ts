import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/countries-list.ts";

Deno.test("countries-list: opts out of requiring auth (the endpoint is genuinely public)", () => {
  assertEquals(action.requiresAuth, false);
});

Deno.test("countries-list: GETs /countries and returns the raw list", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        http_code: 200,
        response_code: "SUCCESS",
        response_msg: "List of Countries.",
        data: [{ code: "AU", value: "Australia" }, {
          code: "US",
          value: "United States of America",
        }],
      },
    },
  ]);
  const result = await action.execute({}, ctx) as { countries: Array<{ code?: string }> };
  assertEquals(calls[0].url, "https://rest.clicksend.com/v3/countries");
  assertEquals(result.countries.length, 2);
  assertEquals(result.countries[0].code, "AU");
});
