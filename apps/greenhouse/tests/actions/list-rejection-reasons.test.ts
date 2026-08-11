import { assert, assertEquals, assertThrows } from "@std/assert";
import listRejectionReasons from "../../actions/list-rejection-reasons.ts";
import { listPage, mockCtx, pathOf, queryOf } from "../_helpers.ts";

Deno.test("list-rejection-reasons: calls GET /v3/rejection_reasons", async () => {
  const { ctx, calls } = mockCtx([listPage([{ id: 1, name: "Lacked skills" }])]);
  await listRejectionReasons.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v3/rejection_reasons");
});

/**
 * Greenhouse's built-in reasons are excluded unless asked for, which is how a
 * lookup that only ever sees custom reasons misses the one in use.
 */
Deno.test("list-rejection-reasons: the defaults are opt-in", async () => {
  const { ctx, calls } = mockCtx([listPage([]), listPage([])]);
  await listRejectionReasons.execute({}, ctx);
  assertEquals(queryOf(calls[0].url), {});

  await listRejectionReasons.execute({ includeDefaults: true }, ctx);
  assertEquals(queryOf(calls[1].url), { include_defaults: "true" });
});

/** This is the lookup `reject-application` cannot work without. */
Deno.test("list-rejection-reasons: says why the id matters more than the name", () => {
  assert(listRejectionReasons.description?.includes("Reject Application"));
});

Deno.test("list-rejection-reasons: a cursor rejects the defaults flag it already carries", () => {
  const { ctx } = mockCtx([]);
  const err = assertThrows(
    () => listRejectionReasons.execute({ cursor: "N", includeDefaults: true }, ctx),
    Error,
  );
  assert(err.message.includes("include_defaults"), err.message);
});
