import type { ActionDefinition } from "@w6w/types";
import { LemonSqueezyClient } from "../lib/client.ts";

/** `GET /v1/license-keys/:id`. */
interface Input {
  licenseKeyId: string;
}

const licenseKeyGet: ActionDefinition<Input> = {
  key: "license-key-get",
  type: "read",
  resource: "license-key",
  title: "Get License Key",
  description: "Retrieve a single license key by ID.",
  params: [{ key: "licenseKeyId", label: "License Key ID", type: "string", required: true }],
  output: [{ key: "data", type: "object", label: "The License Key object" }],

  execute(input, ctx) {
    return new LemonSqueezyClient(ctx).request(
      `/license-keys/${encodeURIComponent(input.licenseKeyId)}`,
    );
  },
};

export default licenseKeyGet;
