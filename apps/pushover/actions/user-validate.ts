import type { ActionDefinition } from "@w6w/types";
import { PushoverClient, toForm } from "../lib/client.ts";

/**
 * `POST /1/users/validate.json` — is this user key real and reachable?
 *
 * Two things make this worth an action rather than only a connect-time probe:
 * it confirms the account has **at least one active device**, and it returns the
 * device names, which is what `message-send`'s Device parameter takes.
 *
 * A user key with no active device is valid and delivers nothing, so a workflow
 * collecting keys from its own users should validate before storing one — which
 * is exactly what the vendor recommends this endpoint for.
 *
 * It is a `read`, not a `perform`: nothing changes, and it sends no notification.
 */
interface Input {
  userOverride?: string;
  device?: string;
}

const userValidate: ActionDefinition<Input> = {
  key: "user-validate",
  type: "read",
  resource: "user",
  title: "Validate User Key",
  description:
    "Check that a user or group key is valid and has at least one active device, and list those " +
    "devices.",
  params: [
    {
      key: "userOverride",
      label: "User or group key",
      type: "string",
      hint:
        "Leave empty to validate this connection's own recipient. Supply a key to check someone " +
        "else's before storing it.",
    },
    {
      key: "device",
      label: "Device",
      type: "string",
      hint: "Validate one named device rather than the account as a whole.",
    },
  ],
  output: [
    { key: "status", type: "number", label: "`1` when the key is valid and reachable" },
    { key: "devices", type: "array", label: "Names of the account's active devices" },
    { key: "licenses", type: "array", label: "Platforms the account is licensed for" },
  ],

  execute(input, ctx) {
    return new PushoverClient(ctx).request("/1/users/validate.json", {
      method: "POST",
      // `sign` fills `user` from the Connection when the override is absent.
      form: toForm({ user: input.userOverride, device: input.device }),
    });
  },
};

export default userValidate;
