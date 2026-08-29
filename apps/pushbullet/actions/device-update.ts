import type { ActionDefinition } from "@w6w/types";
import { compact, PushbulletClient } from "../lib/client.ts";

/** `POST /v2/devices/{iden}` — sets whichever fields are supplied. */
interface Input {
  iden: string;
  nickname?: string;
  model?: string;
  manufacturer?: string;
  pushToken?: string;
  appVersion?: number;
  icon?: string;
  hasSms?: boolean;
}

const deviceUpdate: ActionDefinition<Input> = {
  key: "device-update",
  type: "perform",
  resource: "device",
  title: "Update Device",
  description: "Update an existing device's display or registration fields.",
  idempotent: true,
  params: [
    { key: "iden", label: "Device ID", type: "string", required: true },
    { key: "nickname", label: "Nickname", type: "string" },
    { key: "model", label: "Model", type: "string", advanced: true },
    { key: "manufacturer", label: "Manufacturer", type: "string", advanced: true },
    { key: "icon", label: "Icon", type: "string", advanced: true },
    { key: "pushToken", label: "Push token", type: "string", advanced: true },
    { key: "appVersion", label: "App version", type: "number", advanced: true },
    { key: "hasSms", label: "Has SMS capability", type: "boolean", advanced: true },
  ],
  output: [
    { key: "iden", type: "string", label: "Device ID" },
    { key: "nickname", type: "string", label: "Nickname" },
  ],

  async execute(input, ctx) {
    return await new PushbulletClient(ctx).json(`/devices/${encodeURIComponent(input.iden)}`, {
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

export default deviceUpdate;
