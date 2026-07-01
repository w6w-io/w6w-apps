import type { ActionDefinition } from "@w6w/types";
import { GmailClient } from "../lib/client.ts";

interface Input {
  name: string;
  labelListVisibility?: "labelShow" | "labelHide" | "labelShowIfUnread";
  messageListVisibility?: "show" | "hide";
}

/**
 * Create a user-owned label.
 *
 * https://developers.google.com/gmail/api/reference/rest/v1/users.labels/create
 */
const createLabel: ActionDefinition<Input> = {
  key: "create-label",
  type: "perform",
  resource: "label",
  title: "Create Label",
  description: "Create a Gmail label.",
  params: [
    { key: "name", label: "Name", type: "string", required: true },
    {
      key: "labelListVisibility",
      label: "Label List Visibility",
      type: "select",
      default: "labelShow",
      options: [
        { value: "labelShow", label: "Show" },
        { value: "labelHide", label: "Hide" },
        { value: "labelShowIfUnread", label: "Show if unread" },
      ],
    },
    {
      key: "messageListVisibility",
      label: "Message List Visibility",
      type: "select",
      default: "show",
      options: [
        { value: "show", label: "Show" },
        { value: "hide", label: "Hide" },
      ],
    },
  ],

  async execute(input, ctx) {
    const client = new GmailClient(ctx);
    return client.request("/users/me/labels", {
      method: "POST",
      body: {
        name: input.name,
        labelListVisibility: input.labelListVisibility ?? "labelShow",
        messageListVisibility: input.messageListVisibility ?? "show",
      },
    });
  },
};

export default createLabel;
