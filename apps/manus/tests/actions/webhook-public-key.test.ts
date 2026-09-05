import { assertEquals } from "@std/assert";
import webhookPublicKey from "../../actions/webhook-public-key.ts";
import { mockCtx, okBody, pathOf } from "../_helpers.ts";

Deno.test("webhook-public-key: gets /v2/webhook.publicKey and returns the key + algorithm", async () => {
  const { ctx, calls } = mockCtx([{
    body: okBody({ public_key: "-----BEGIN PUBLIC KEY-----...", algorithm: "RSA-SHA256" }),
  }]);
  const out = await webhookPublicKey.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/v2/webhook.publicKey");
  assertEquals(out, { public_key: "-----BEGIN PUBLIC KEY-----...", algorithm: "RSA-SHA256" });
});
