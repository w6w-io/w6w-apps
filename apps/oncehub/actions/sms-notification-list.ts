import type { ActionDefinition } from "@w6w/types";
import { OnceHubClient } from "../lib/client.ts";

interface Input {
  creationTimeGt?: string;
  creationTimeLt?: string;
  recipient?: string;
  recipientType?: string;
  expand?: string;
  before?: string;
  after?: string;
  limit?: number;
}

/** GET /notifications/sms — SMS delivery log, sorted by creation date. */
const smsNotificationList: ActionDefinition<Input> = {
  key: "sms-notification-list",
  type: "read",
  resource: "notification",
  title: "List SMS Notifications",
  description: "List SMS notifications sent from the account (GET /notifications/sms).",
  output: [
    { key: "object", type: "string", label: "Object type (list)" },
    { key: "data", type: "array", label: "SMS notifications" },
    { key: "has_more", type: "boolean", label: "More results available" },
  ],
  params: [
    { key: "creationTimeGt", label: "Created after", type: "datetime" },
    { key: "creationTimeLt", label: "Created before", type: "datetime" },
    { key: "recipient", label: "Recipient ID", type: "string", hint: "A contact or user ID." },
    {
      key: "recipientType",
      label: "Recipient type",
      type: "select",
      options: [{ label: "Contact", value: "contact" }, { label: "User", value: "user" }],
    },
    {
      key: "expand",
      label: "Expand",
      type: "string",
      advanced: true,
      hint: "Currently supports: recipient.",
    },
    { key: "before", label: "Before cursor", type: "string", advanced: true },
    { key: "after", label: "After cursor", type: "string", advanced: true },
    { key: "limit", label: "Limit", type: "number", default: 10, advanced: true, hint: "1-100." },
  ],

  execute(input, ctx) {
    return new OnceHubClient(ctx).request("/notifications/sms", {
      query: {
        "creation_time.gt": input.creationTimeGt,
        "creation_time.lt": input.creationTimeLt,
        recipient: input.recipient,
        recipient_type: input.recipientType,
        expand: input.expand,
        before: input.before,
        after: input.after,
        limit: input.limit,
      },
    });
  },
};

export default smsNotificationList;
