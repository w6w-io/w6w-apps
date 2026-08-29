import { assertEquals } from "@std/assert";
import operationList from "../../actions/operation-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("operation-list: GETs /v2/operations with the vendor's filter[] keys", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: { data: [{ operation: "convert", input_format: "docx", output_format: "pdf" }] },
  }]);
  const out = await operationList.execute(
    { filterOperation: "convert", filterOutputFormat: "pdf", alternatives: true },
    ctx,
  ) as { data: unknown[] };

  assertEquals(pathOf(calls[0].url), "/v2/operations");
  assertEquals(queryOf(calls[0].url), {
    "filter[operation]": "convert",
    "filter[output_format]": "pdf",
    alternatives: "true",
  });
  assertEquals(out.data.length, 1);
});

Deno.test("operation-list: requires no auth — the endpoint is genuinely public", () => {
  assertEquals(operationList.requiresAuth, false);
});

Deno.test("operation-list: is not chosen as the auth probe (see auth/api-token.ts)", async () => {
  // A request with NO Authorization header must still succeed, matching the live
  // 2026-08-29 measurement that this endpoint needs no credential at all.
  const { ctx, calls } = mockCtx([{ status: 200, body: { data: [] } }]);
  await operationList.execute({}, ctx);
  assertEquals("authorization" in calls[0].headers, false);
});
