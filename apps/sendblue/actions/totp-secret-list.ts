import type { ActionDefinition } from "@w6w/types";
import { SendblueClient } from "../lib/client.ts";

type Input = Record<string, never>;

/** `GET /api/v2/totp/secrets` — the encrypted secret values are never returned by this call. */
const totpSecretList: ActionDefinition<Input> = {
  key: "totp-secret-list",
  type: "search",
  resource: "totp",
  title: "List TOTP Secrets",
  description: "List stored TOTP secrets. The base32 secret value itself is never included here.",
  params: [],
  output: [{ key: "totp_secrets", type: "array", label: "TOTP secrets" }],

  execute(_input, ctx) {
    const client = new SendblueClient(ctx);
    return client.get("/api/v2/totp/secrets");
  },
};

export default totpSecretList;
