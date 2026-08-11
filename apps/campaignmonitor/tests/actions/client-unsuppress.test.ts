import { assert, assertEquals, assertRejects } from "@std/assert";
import clientUnsuppress from "../../actions/client-unsuppress.ts";
import { API_PATH, errorBody, mockCtx, pathOf, queryOf } from "../_helpers.ts";

/** PUT, not DELETE, and the address travels in the query string. */
Deno.test("client-unsuppress: PUTs with the address in the query string", async () => {
  const { ctx, calls } = mockCtx([{ status: 200 }]);
  const out = await clientUnsuppress.execute({ clientId: "cid", email: "a@example.com" }, ctx);
  assertEquals(calls[0].method, "PUT");
  assertEquals(pathOf(calls[0].url), `${API_PATH}/clients/cid/unsuppress.json`);
  assertEquals(queryOf(calls[0].url), { email: "a@example.com" });
  assertEquals(calls[0].body, null);
  assertEquals(out, { email: "a@example.com" });
});

/**
 * The retry story: a second call is answered 176. The action is idempotent in
 * effect but not silent, and the code must reach the caller.
 */
Deno.test("client-unsuppress: surfaces code 176 verbatim on a repeat", async () => {
  const { ctx } = mockCtx([
    { status: 400, body: errorBody(176, "Email address not in suppression list") },
  ]);
  const err = await assertRejects(
    async () => await clientUnsuppress.execute({ clientId: "cid", email: "a@example.com" }, ctx),
    Error,
  );
  assert(err.message.includes("code 176"), err.message);
  assert(err.message.includes("not in suppression list"), err.message);
});

Deno.test("client-unsuppress: is declared idempotent", () => {
  assertEquals(clientUnsuppress.idempotent, true);
});
