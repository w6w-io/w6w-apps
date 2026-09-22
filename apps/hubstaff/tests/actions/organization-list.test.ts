import { assertEquals } from "@std/assert";
import { listEnvelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";
import action from "../../actions/organization-list.ts";

Deno.test("organization-list: GETs /v2/organizations and returns the envelope whole", async () => {
  const body = listEnvelope("organizations", [{ id: 1, name: "Acme" }], 7);
  const { ctx, calls } = mockCtx([{ status: 200, body }]);
  const result = await action.execute!({}, ctx) as typeof body;

  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/organizations");
  assertEquals(result.organizations.length, 1);
  assertEquals(result.pagination, { next_page_start_id: 7 });
});

Deno.test("organization-list: the first page sends no cursor at all", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope("organizations", []) }]);
  await action.execute!({}, ctx);
  assertEquals(new URL(calls[0].url).search, "");
});

Deno.test("organization-list: prefills the vendor page size and carries a cursor", async () => {
  const limit = action.params!.find((p) => p.key === "page_limit")!;
  assertEquals(limit.default, 100);
  assertEquals(limit.validation?.max, 500);

  const { ctx, calls } = mockCtx([{ status: 200, body: listEnvelope("organizations", []) }]);
  await action.execute!({ page_start_id: 7, page_limit: 25 }, ctx);
  assertEquals(queryOf(calls[0].url), { page_start_id: "7", page_limit: "25" });
});
