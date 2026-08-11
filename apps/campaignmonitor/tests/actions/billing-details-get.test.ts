import { assert, assertEquals, assertRejects } from "@std/assert";
import billingDetailsGet from "../../actions/billing-details-get.ts";
import { API_PATH, errorBody, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("billing-details-get: GETs the account-level /billingdetails.json", async () => {
  const { ctx, calls } = mockCtx([{ body: { Credits: 3021 } }]);
  const out = await billingDetailsGet.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), `${API_PATH}/billingdetails.json`);
  assertEquals(out.Credits, 3021);
});

/**
 * A non-agency customer gets 403 with code 403 — a live credential refused an
 * endpoint. The message must say so rather than flattening to "forbidden".
 */
Deno.test("billing-details-get: surfaces the non-agency 403 with its code", async () => {
  const { ctx } = mockCtx([
    { status: 403, body: errorBody(403, "Not allowed for a Non-agency Customer.") },
  ]);
  const err = await assertRejects(async () => await billingDetailsGet.execute({}, ctx), Error);
  assert(err.message.includes("code 403"), err.message);
  assert(err.message.includes("Non-agency"), err.message);
  assert(
    err.message.includes("the credential is live"),
    "the code-403 gloss must say the credential was accepted: " + err.message,
  );
});
