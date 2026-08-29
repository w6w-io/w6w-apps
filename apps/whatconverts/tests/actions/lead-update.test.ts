import { assertEquals } from "@std/assert";
import leadUpdate from "../../actions/lead-update.ts";
import { API_ROOT, mockCtx } from "../_helpers.ts";

Deno.test("lead-update posts only the fields provided", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { lead_id: 148099 } }]);
  const out = await leadUpdate.execute({ leadId: 148099, quotable: "yes", quoteValue: 251 }, ctx);
  assertEquals(out, { lead_id: 148099 });
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].url, `${API_ROOT}/leads/148099`);
  assertEquals(JSON.parse(calls[0].body!), { quotable: "yes", quote_value: 251 });
});

Deno.test("lead-update serializes custom_fields JSON", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }]);
  await leadUpdate.execute({ leadId: 1, customFields: { "Company Name": "Acme" } }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { custom_fields: { "Company Name": "Acme" } });
});
