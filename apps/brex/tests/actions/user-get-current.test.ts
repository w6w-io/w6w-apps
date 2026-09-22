import { assertEquals } from "@std/assert";
import userGetCurrent from "../../actions/user-get-current.ts";
import { PROBE_PATH } from "../../auth/api-token.ts";
import { mockCtx, pathOf, queryOf, USER } from "../_helpers.ts";

Deno.test("user-get-current: GETs the whoami and sends no auth header", async () => {
  const { ctx, calls } = mockCtx([{ body: USER }]);
  const result = await userGetCurrent.execute({}, ctx) as typeof USER;

  assertEquals(calls[0].method, "GET");
  assertEquals(pathOf(calls[0].url), "/v2/users/me");
  // The credential is the `sign` hook's business, never an action's.
  assertEquals(calls[0].headers.authorization, undefined);
  assertEquals(result.email, "ada@example.com");
});

/**
 * The action and the credential probe are the same call. Pinning them to one
 * constant is what stops an edit to either from silently splitting them.
 */
Deno.test("user-get-current: it is the probe's endpoint, by shared constant", async () => {
  const { ctx, calls } = mockCtx([{ body: USER }]);
  await userGetCurrent.execute({}, ctx);

  assertEquals(pathOf(calls[0].url), `/v2${PROBE_PATH}`);
});

Deno.test("user-get-current: load_custom_fields is off unless asked for", async () => {
  const off = mockCtx([{ body: USER }]);
  await userGetCurrent.execute({}, off.ctx);
  assertEquals(queryOf(off.calls[0].url), {});

  const on = mockCtx([{ body: USER }]);
  await userGetCurrent.execute({ loadCustomFields: true }, on.ctx);
  assertEquals(queryOf(on.calls[0].url), { load_custom_fields: "true" });
});

Deno.test("user-get-current: the response passes through verbatim", async () => {
  const { ctx } = mockCtx([{ body: USER }]);
  const result = await userGetCurrent.execute({}, ctx) as typeof USER;

  assertEquals(result, USER);
});

Deno.test("user-get-current: it is a read with no required params", () => {
  assertEquals(userGetCurrent.type, "read");
  assertEquals(userGetCurrent.params?.every((p) => !p.required), true);
});
