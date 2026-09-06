import type { ActionDefinition } from "@w6w/types";
import { stripSecrets, VapiClient } from "../lib/client.ts";
import { idParam } from "../lib/params.ts";

interface Input {
  id: string;
}

const phoneNumberGet: ActionDefinition<Input> = {
  key: "phone-number-get",
  type: "read",
  resource: "phone-number",
  title: "Get Phone Number",
  description: "Read one phone number's configuration by id.",
  params: [idParam("Phone Number ID")],
  output: [
    { key: "id", type: "string", label: "Phone Number ID" },
    { key: "number", type: "string", label: "Number" },
    { key: "provider", type: "string", label: "Provider" },
  ],

  async execute(input, ctx) {
    const phoneNumber = await new VapiClient(ctx).json(
      `/phone-number/${encodeURIComponent(input.id)}`,
    );
    return stripSecrets(phoneNumber);
  },
};

export default phoneNumberGet;
