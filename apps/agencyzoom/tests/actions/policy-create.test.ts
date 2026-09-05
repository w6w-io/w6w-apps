import { assertEquals } from "@std/assert";
import policyCreate from "../../actions/policy-create.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const REQUIRED = {
  customerId: 100,
  soldDate: "08/29/2019",
  agentId: 5,
  policyType: 25,
  premium: 34500,
  items: 1,
  leadSourceId: 10,
  agencyNumber: "A0A0070",
  effectiveDate: "08/29/2019",
  expiryDate: "08/29/2020",
};

Deno.test("policy-create: POSTs to /policies/create", async () => {
  const { ctx, calls } = mockCtx([{ body: { message: "ok", id: 200 } }]);
  const result = await policyCreate.execute(REQUIRED, ctx);

  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0].url), "/v1/api/policies/create");
  assertEquals(JSON.parse(calls[0].body!), REQUIRED);
  assertEquals(result, { message: "ok", id: 200 });
});

/**
 * This is the ONE action whose request must carry the extra `x-api-token`
 * header — but that is `sign`'s job (see `auth/login.ts`), not this action's.
 * Pinning it here too means a future refactor that inlines the header into
 * the action (a credential leak — see `core/docs/build-a-w6w-app.md`'s hard
 * rules) is caught by the entry-module guard in `tests/index.test.ts`.
 */
Deno.test("policy-create: never sets an auth header itself", () => {
  const src = Deno.readTextFileSync(
    new URL("../../actions/policy-create.ts", import.meta.url),
  );
  assertEquals(/x-api-token/i.test(src.replace(/\/\*[\s\S]*?\*\//g, "")), false);
});

Deno.test("policy-create: is declared non-idempotent", () => {
  assertEquals(policyCreate.idempotent, false);
});
