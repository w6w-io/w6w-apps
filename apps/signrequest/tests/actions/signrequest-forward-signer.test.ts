import { assertEquals } from "@std/assert";
import signrequestForwardSigner from "../../actions/signrequest-forward-signer.ts";
import { bodyOf, mockCtx, pathOf } from "../_helpers.ts";

Deno.test("signrequest-forward-signer: POSTs /signrequests/{id}/forward_signer/ with both emails", async () => {
  const { ctx, calls } = mockCtx([{ status: 201, body: {} }]);
  await signrequestForwardSigner.execute({
    signrequestId: "sr-1",
    signerEmailToForward: "a@example.com",
    signerEmailToForwardTo: "b@example.com",
    forwardedReason: "Out of office",
  }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(pathOf(calls[0]), "/api/v1/signrequests/sr-1/forward_signer/");
  assertEquals(bodyOf(calls[0]), {
    signer_email_to_forward: "a@example.com",
    signer_email_to_forward_to: "b@example.com",
    forwarded_reason: "Out of office",
  });
});
