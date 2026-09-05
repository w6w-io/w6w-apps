import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/lead-get.ts";

const conn = { display: { restBaseUrl: "https://123-abc-456.mktorest.com" } };

Deno.test("lead-get: GETs /rest/v1/lead/{id}.json", async () => {
  const { ctx, calls } = mockCtx([
    { body: { success: true, result: [{ id: 1, email: "jim@example.com" }] } },
  ], conn);
  const out = await action.execute!({ leadId: 1 }, ctx);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://123-abc-456.mktorest.com/rest/v1/lead/1.json");
  assertEquals(out, { id: 1, email: "jim@example.com" });
});

Deno.test("lead-get: passes fields through as a query parameter", async () => {
  const { ctx, calls } = mockCtx([{ body: { success: true, result: [{ id: 1 }] } }], conn);
  await action.execute!({ leadId: 1, fields: "email,firstName" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("fields"), "email,firstName");
});

Deno.test("lead-get: rejects a non-numeric leadId", async () => {
  const { ctx } = mockCtx([], conn);
  await (async () => {
    let threw = false;
    try {
      await action.execute!({ leadId: "abc" }, ctx);
    } catch {
      threw = true;
    }
    assertEquals(threw, true);
  })();
});

Deno.test("lead-get: returns null when Marketo answers an empty result array", async () => {
  const { ctx } = mockCtx([{ body: { success: true, result: [] } }], conn);
  const out = await action.execute!({ leadId: 999999 }, ctx);
  assertEquals(out, null);
});
