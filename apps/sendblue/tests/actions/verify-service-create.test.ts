import { assertEquals } from "@std/assert";
import verifyServiceCreate from "../../actions/verify-service-create.ts";
import { jsonBodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("verify-service-create: POSTs to /api/v2/verify/services", async () => {
  const { ctx, calls } = mockCtx([{ body: { sid: "SV1", url: "https://api.sendblue.co/x" } }]);
  await verifyServiceCreate.execute({ friendlyName: "Login", codeLength: 6, ttlSeconds: 300 }, ctx);

  assertEquals(pathOf(calls[0].url), "/api/v2/verify/services");
  assertEquals(jsonBodyOf(calls[0]), {
    friendly_name: "Login",
    code_length: 6,
    ttl_seconds: 300,
  });
});
