import type { ActionDefinition } from "@w6w/types";
import { compact, PushbulletClient } from "../lib/client.ts";

/**
 * `POST /v2/devices` — register a new device (often a "virtual" one, so a
 * workflow can push to a name of its own choosing).
 *
 * No field here dedupes against an existing device: `fingerprint` exists on
 * the `Device` object for that purpose, but is not among create-device's
 * documented request fields, so it appears to be populated by the native
 * clients rather than settable through this endpoint. Calling this twice with
 * the same nickname creates two separate devices.
 */
interface Input {
  nickname?: string;
  model?: string;
  manufacturer?: string;
  pushToken?: string;
  appVersion?: number;
  icon?: string;
  hasSms?: boolean;
}

const deviceCreate: ActionDefinition<Input> = {
  key: "device-create",
  type: "perform",
  resource: "device",
  title: "Create Device",
  description:
    "Register a new device — commonly a virtual one used only to receive workflow pushes.",
  idempotent: false,
  params: [
    {
      key: "nickname",
      label: "Nickname",
      type: "string",
      hint: "Name shown when displaying this device.",
    },
    { key: "model", label: "Model", type: "string", advanced: true },
    { key: "manufacturer", label: "Manufacturer", type: "string", advanced: true },
    {
      key: "icon",
      label: "Icon",
      type: "string",
      default: "system",
      hint: 'Arbitrary string. Common values: "desktop", "browser", "website", "laptop", ' +
        '"tablet", "phone", "watch", "system".',
    },
    {
      key: "pushToken",
      label: "Push token",
      type: "string",
      advanced: true,
      hint: "Platform-specific push token. Leave blank for a device you will read from the " +
        "Realtime Event Stream instead of native push.",
    },
    { key: "appVersion", label: "App version", type: "number", advanced: true },
    { key: "hasSms", label: "Has SMS capability", type: "boolean", advanced: true },
  ],
  output: [
    { key: "iden", type: "string", label: "Device ID" },
    { key: "nickname", type: "string", label: "Nickname" },
  ],

  async execute(input, ctx) {
    return await new PushbulletClient(ctx).json("/devices", {
      method: "POST",
      body: compact({
        nickname: input.nickname,
        model: input.model,
        manufacturer: input.manufacturer,
        push_token: input.pushToken,
        app_version: input.appVersion,
        icon: input.icon,
        has_sms: input.hasSms,
      }),
    });
  },
};

export default deviceCreate;
