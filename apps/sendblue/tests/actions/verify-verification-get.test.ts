import { assertEquals } from "@std/assert";
import verifyVerificationGet from "../../actions/verify-verification-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("verify-verification-get: GETs .../verifications/{verification_sid}", async () => {
  const { ctx, calls } = mockCtx([{ body: { sid: "VR1", status: "approved" } }]);
  await verifyVerificationGet.execute({ serviceSid: "SV1", verificationSid: "VR1" }, ctx);
  assertEquals(pathOf(calls[0].url), "/api/v2/verify/services/SV1/verifications/VR1");
});
