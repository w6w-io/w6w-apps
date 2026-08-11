import { assert, assertEquals } from "@std/assert";
import datasetCreate from "../../actions/dataset-create.ts";
import { envelope, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("dataset-create: POSTs to /v2/datasets with the name as a query parameter", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ id: "d1", name: "results" }) }]);
  const out = await datasetCreate.execute({ name: "results" }, ctx) as { id: string };

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v2/datasets");
  // The name is a query parameter, not a body field — the endpoint takes no body.
  assertEquals(queryOf(calls[0].url), { name: "results" });
  assertEquals(calls[0].body, null);
  assertEquals(out.id, "d1");
});

Deno.test("dataset-create: an unnamed create sends no name at all", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: envelope({ id: "d2" }) }]);
  await datasetCreate.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});
});

/**
 * With a name this endpoint is get-or-create; without one it creates a fresh
 * unnamed dataset every call. Idempotency is therefore a property of the
 * caller's input, not of the endpoint, and the honest declaration is `false`.
 */
Deno.test("dataset-create: is declared non-idempotent", () => {
  assertEquals(datasetCreate.idempotent, false);
});

Deno.test("dataset-create: the signing key is stripped from the created dataset", async () => {
  const { ctx } = mockCtx([
    { status: 201, body: envelope({ id: "d1", urlSigningSecretKey: "hmac-key-do-not-leak" }) },
  ]);
  const out = await datasetCreate.execute({ name: "x" }, ctx) as Record<string, unknown>;
  assertEquals("urlSigningSecretKey" in out, false);
  assert(!JSON.stringify(out).includes("hmac-key-do-not-leak"));
});
