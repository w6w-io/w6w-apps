import { assert, assertEquals } from "@std/assert";
import hookVerifyRequest from "../../actions/hook-verify-request.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("hook-verify-request: POSTs to the verify/request endpoint", async () => {
  const { ctx, calls } = mockCtx([{ status: 204 }]);
  assertEquals(await hookVerifyRequest.execute({ hookId: "42" }, ctx), { status: 204 });
  assertEquals(pathOf(calls[0].url), "/hook/42/verify/request");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].body, null);
});

/**
 * Re-requesting simply sends another code, which is exactly how you recover
 * from a lost callback — so retrying is the right behaviour, not a hazard.
 */
Deno.test("hook-verify-request: is declared idempotent", () => {
  assertEquals(hookVerifyRequest.idempotent, true);
  assertEquals(hookVerifyRequest.type, "perform");
});

Deno.test("hook-verify-request: the description says where the code goes", () => {
  const description = hookVerifyRequest.description ?? "";
  assert(description.includes("verification code to a webhook's URL"));
  assert(description.includes("Your endpoint"));
});
