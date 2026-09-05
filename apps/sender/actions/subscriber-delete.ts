import type { ActionDefinition } from "@w6w/types";
import { compact, SenderClient } from "../lib/client.ts";

/**
 * `DELETE /v2/subscribers` — deletes one or more subscribers by email.
 *
 * Answers `{"message": "...", "delete_instance": "..."}` — no `data`, no
 * `success` field, per the vendor's own worked example. `.data()` falls back
 * to returning the body verbatim since it carries no `data` key.
 */
interface Input {
  subscribers?: string[];
  conditions?: string;
}

const subscriberDelete: ActionDefinition<Input> = {
  key: "subscriber-delete",
  type: "perform",
  resource: "subscriber",
  title: "Delete Subscriber",
  description: "Delete one or more subscribers by email address.",
  idempotent: true,
  params: [
    {
      key: "subscribers",
      label: "Emails",
      type: "multiselect",
      hint: "Email addresses of the subscribers to delete.",
    },
    {
      key: "conditions",
      label: "Conditions",
      type: "string",
      hint: "Selects all matching subscribers at once. Cannot be combined with Emails.",
    },
  ],
  output: [
    { key: "message", type: "string", label: "Message" },
    { key: "delete_instance", type: "string", label: "Delete instance reference" },
  ],

  execute(input, ctx) {
    return new SenderClient(ctx).data("/subscribers", {
      method: "DELETE",
      body: compact({ subscribers: input.subscribers, conditions: input.conditions }),
    });
  },
};

export default subscriberDelete;
