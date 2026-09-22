import { assertEquals } from "@std/assert";
import { envelope, mockCtx, pathOf } from "../_helpers.ts";
import action from "../../actions/organization-get.ts";

Deno.test("organization-get: GETs /v2/organizations/{id}", async () => {
  const body = envelope("organization", { id: 42, name: "Acme" });
  const { ctx, calls } = mockCtx([{ status: 200, body }]);
  const result = await action.execute!({ organization_id: 42 }, ctx) as typeof body;

  assertEquals(pathOf(calls[0].url), "/v2/organizations/42");
  assertEquals(calls[0].method, "GET");
  assertEquals(result.organization.id, 42);
});

Deno.test("organization-get: a 404 surfaces Hubstaff's own body, not a bare status", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { code: "not_found", error_code: 12000, error: "resource not found" },
  }]);
  const err = await Promise.resolve(action.execute!({ organization_id: 42 }, ctx))
    .catch((e: Error) => e);
  assertEquals(
    (err as Error).message,
    "Hubstaff 404 not_found for GET /v2/organizations/42: resource not found",
  );
});
