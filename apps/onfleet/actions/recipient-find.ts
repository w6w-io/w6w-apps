import type { ActionDefinition } from "@w6w/types";
import { compact, OnfleetClient } from "../lib/client.ts";

/**
 * `GET /recipients/name/:name` or `GET /recipients/phone/:phone` — look up a
 * recipient by an exact name or phone match. Names are case-insensitive;
 * phones are E.164-formatted per the organization's `country` before the
 * lookup runs.
 */
const action: ActionDefinition = {
  key: "recipient-find",
  type: "read",
  resource: "recipient",
  title: "Find recipient",
  description: "Find a recipient by exact name or phone number match.",
  params: [
    {
      key: "by",
      label: "Look up by",
      type: "select",
      required: true,
      default: "phone",
      options: [
        { value: "phone", label: "Phone" },
        { value: "name", label: "Name" },
      ],
    },
    { key: "value", label: "Value", type: "string", required: true },
    {
      key: "skipPhoneNumberValidation",
      label: "Skip phone number validation",
      type: "boolean",
      default: false,
      advanced: true,
      hint: "Set if the recipient was created without phone validation.",
    },
  ],
  output: [
    { key: "id", type: "string", label: "ID" },
    { key: "name", type: "string", label: "Name" },
    { key: "phone", type: "string", label: "Phone" },
  ],

  async execute(input, ctx) {
    const { by, value, skipPhoneNumberValidation } = input as {
      by: string;
      value: string;
      skipPhoneNumberValidation?: boolean;
    };
    if (!value) throw new Error("`value` is required");
    if (by !== "name" && by !== "phone") throw new Error("`by` must be `name` or `phone`");

    return await new OnfleetClient(ctx).request(
      `/recipients/${by}/${encodeURIComponent(value)}`,
      {
        query: compact({
          skipPhoneNumberValidation: skipPhoneNumberValidation === true ? true : undefined,
        }) as Record<string, boolean>,
      },
    );
  },
};

export default action;
