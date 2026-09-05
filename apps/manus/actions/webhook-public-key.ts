import type { ActionDefinition } from "@w6w/types";
import { ManusClient, type WebhookPublicKeyResponse } from "../lib/client.ts";

interface Output {
  public_key: string;
  algorithm: string;
}

/**
 * `GET /v2/webhook.publicKey` — the PEM-encoded RSA public key (always
 * `RSA-SHA256`) used to verify a webhook notification's signature. Rarely
 * changes, so a workflow calling this to verify inbound notifications can
 * cache the result rather than fetching it per notification.
 */
const webhookPublicKey: ActionDefinition<Record<string, never>, Output> = {
  key: "webhook-public-key",
  type: "read",
  resource: "webhook",
  title: "Get Webhook Public Key",
  description: "Get the public key used to verify webhook notification signatures.",
  params: [],
  output: [
    { key: "public_key", type: "string", label: "PEM-encoded RSA public key" },
    { key: "algorithm", type: "string", label: "Signature algorithm (RSA-SHA256)" },
  ],

  async execute(_input, ctx) {
    const res = await new ManusClient(ctx).request<WebhookPublicKeyResponse>(
      "/v2/webhook.publicKey",
    );
    return { public_key: res.public_key, algorithm: res.algorithm };
  },
};

export default webhookPublicKey;
