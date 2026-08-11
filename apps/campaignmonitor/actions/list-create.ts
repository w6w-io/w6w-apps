import type { ActionDefinition } from "@w6w/types";
import { CampaignMonitorClient, encodeId } from "../lib/client.ts";
import { clientIdParam } from "../lib/params.ts";

/**
 * `POST /api/v3.3/lists/{clientid}.json` — create a subscriber list.
 * **Client-level** (the path id is the *client*, not a list).
 *
 * Responds `201 Created` with the new list id as a **bare JSON string**:
 * `"a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1a1"`. Not an object, not an envelope. It is
 * wrapped into `{ListID}` here so the next step in a workflow has something to
 * reference by name.
 *
 * ## `UnsubscribeSetting` is the consequential field
 *
 * `AllClientLists` (the vendor's recommendation) means an unsubscribe from this
 * list unsubscribes the person from **every** list of this client, and the list
 * honours the client-wide suppression list. `OnlyThisList` scopes the
 * unsubscribe to this list — and the vendor spells out the corollary that is
 * easy to miss: "Setting `OnlyThisList` will result in this list **not using the
 * suppression list**, meaning that if a subscriber on this list is added to the
 * suppression list they will not be unsubscribed from this list."
 *
 * `idempotent: false`: a second call with the same title fails with code 250,
 * "Cannot create a list with the same title as another", so a retry is not a
 * no-op.
 */
interface Input {
  clientId: string;
  title: string;
  unsubscribeSetting?: string;
  confirmedOptIn?: boolean;
  unsubscribePage?: string;
  confirmationSuccessPage?: string;
}

const listCreate: ActionDefinition<Input, { ListID: string }> = {
  key: "list-create",
  type: "perform",
  resource: "list",
  title: "Create List",
  description:
    "Create a subscriber list for a client and return its ID. Fails with code 250 if the title " +
    "duplicates an existing list.",
  idempotent: false,
  params: [
    clientIdParam,
    {
      key: "title",
      label: "Title",
      type: "string",
      required: true,
      hint: "Must be unique within the client (error 250) and non-empty (error 251).",
    },
    {
      key: "unsubscribeSetting",
      label: "Unsubscribe setting",
      type: "select",
      default: "AllClientLists",
      options: [
        {
          value: "AllClientLists",
          label: "All client lists — recommended; also honours the suppression list",
        },
        {
          value: "OnlyThisList",
          label: "Only this list — this list then IGNORES the suppression list",
        },
      ],
      hint:
        "Must be one of these two (error 261). OnlyThisList opts the list out of the client-wide " +
        "suppression list entirely, so a suppressed address stays subscribed here.",
    },
    {
      key: "confirmedOptIn",
      label: "Confirmed (double) opt-in",
      type: "boolean",
      default: false,
      hint:
        "When on, new subscribers get a verification email and stay Unconfirmed until they click " +
        "it. When off, they get the list's confirmation email and are Active immediately.",
    },
    {
      key: "unsubscribePage",
      label: "Unsubscribe page URL",
      type: "string",
      hint: "Where an unsubscriber lands. Leave empty for Campaign Monitor's own page.",
    },
    {
      key: "confirmationSuccessPage",
      label: "Confirmation success page URL",
      type: "string",
      hint: "Where a confirmed-opt-in subscriber lands after verifying.",
    },
  ],
  output: [{ key: "ListID", type: "string", label: "ID of the new list" }],

  async execute(input, ctx) {
    // The endpoint answers a bare JSON string, not an object.
    const listId = await new CampaignMonitorClient(ctx).json<string>(
      `/lists/${encodeId(input.clientId)}`,
      {
        method: "POST",
        body: {
          Title: input.title,
          UnsubscribeSetting: input.unsubscribeSetting ?? "AllClientLists",
          ConfirmedOptIn: input.confirmedOptIn ?? false,
          UnsubscribePage: input.unsubscribePage ?? "",
          ConfirmationSuccessPage: input.confirmationSuccessPage ?? "",
        },
      },
    );
    return { ListID: listId };
  },
};

export default listCreate;
