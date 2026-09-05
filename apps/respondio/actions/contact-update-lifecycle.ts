import type { ActionDefinition } from "@w6w/types";
import { assertIdentifier, RespondioClient } from "../lib/client.ts";

/**
 * `POST /contact/{identifier}/lifecycle/update` — `ContactClient.updateLifecycle`
 * in the official SDK. Body is `{name: string | null}`; `null` removes the
 * lifecycle stage. Idempotent: setting the same stage twice (or clearing it
 * twice) ends in the same state.
 */
interface Input {
  identifier: string;
  lifecycleName?: string;
}

const contactUpdateLifecycle: ActionDefinition<Input> = {
  key: "contact-update-lifecycle",
  type: "perform",
  resource: "contact",
  title: "Update Contact Lifecycle",
  description: "Set or clear a contact's lifecycle stage.",
  idempotent: true,
  params: [
    { key: "identifier", label: "Contact identifier", type: "string", required: true },
    {
      key: "lifecycleName",
      label: "Lifecycle stage",
      type: "string",
      hint: "Leave empty to remove the contact's current lifecycle stage.",
    },
  ],
  output: [
    { key: "code", type: "number", label: "Result code" },
    { key: "message", type: "string", label: "Message" },
  ],

  execute(input, ctx) {
    const identifier = assertIdentifier(input.identifier);
    const name = input.lifecycleName?.trim();
    return new RespondioClient(ctx).post(`/contact/${identifier}/lifecycle/update`, {
      name: name ? name : null,
    });
  },
};

export default contactUpdateLifecycle;
