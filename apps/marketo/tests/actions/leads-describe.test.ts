import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/leads-describe.ts";

const conn = { display: { restBaseUrl: "https://123-abc-456.mktorest.com" } };

Deno.test("leads-describe: GETs /rest/v1/leads/describe.json with no params", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: { success: true, result: [{ id: 2, displayName: "Company Name", dataType: "string" }] },
    },
  ], conn);
  const out = await action.execute!({}, ctx);
  assertEquals(calls[0].url, "https://123-abc-456.mktorest.com/rest/v1/leads/describe.json");
  assertEquals(out, [{ id: 2, displayName: "Company Name", dataType: "string" }]);
});

Deno.test("leads-describe: is safe to invoke with no required params", () => {
  const required = (action.params ?? []).filter((p) => p.required);
  assertEquals(required, []);
});
