/**
 * TextMagic — bulk SMS and business texting: send and schedule text messages,
 * manage contacts, lists, templates and two-way conversations ("chats"), over
 * the TextMagic REST API v2 (`rest.textmagic.com/api/v2`).
 *
 * Every path, verb, query parameter and body field in this app was verified
 * on 2026-09-05 against TextMagic's own machine-readable OpenAPI (Swagger 2.0)
 * document (`docs.textmagic.com/swagger.json`) plus live probes against
 * `rest.textmagic.com`. See `lib/client.ts` for the response-shape and
 * error-format notes, and `auth/basic.ts` for the credential scheme.
 *
 * Deliberately out of scope: Email Campaigns, Distribution Lists (a separate
 * email-to-SMS forwarding feature, not the contact `Lists` this app covers —
 * see `actions/list-create.ts`), Surveys, push tokens, subaccount management,
 * and number provisioning. None of these are wired here; nothing about them
 * is guessed.
 */
import type { AppDefinition } from "@w6w/types";

import accountGet from "./actions/account-get.ts";

import messageSend from "./actions/message-send.ts";
import messageList from "./actions/message-list.ts";
import messageGet from "./actions/message-get.ts";
import messageDelete from "./actions/message-delete.ts";

import contactCreate from "./actions/contact-create.ts";
import contactList from "./actions/contact-list.ts";
import contactGet from "./actions/contact-get.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactDelete from "./actions/contact-delete.ts";

import listCreate from "./actions/list-create.ts";
import listList from "./actions/list-list.ts";
import listGet from "./actions/list-get.ts";
import listDelete from "./actions/list-delete.ts";
import listSetContacts from "./actions/list-set-contacts.ts";

import templateCreate from "./actions/template-create.ts";
import templateList from "./actions/template-list.ts";
import templateGet from "./actions/template-get.ts";
import templateDelete from "./actions/template-delete.ts";

import chatList from "./actions/chat-list.ts";
import chatGet from "./actions/chat-get.ts";
import chatMessagesGet from "./actions/chat-messages-get.ts";

import scheduleList from "./actions/schedule-list.ts";
import scheduleGet from "./actions/schedule-get.ts";
import scheduleDelete from "./actions/schedule-delete.ts";

import basic from "./auth/basic.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";
import requestRate from "./health/request-rate.ts";

export default {
  actions: [
    accountGet,
    messageSend,
    messageList,
    messageGet,
    messageDelete,
    contactCreate,
    contactList,
    contactGet,
    contactUpdate,
    contactDelete,
    listCreate,
    listList,
    listGet,
    listDelete,
    listSetContacts,
    templateCreate,
    templateList,
    templateGet,
    templateDelete,
    chatList,
    chatGet,
    chatMessagesGet,
    scheduleList,
    scheduleGet,
    scheduleDelete,
  ],
  auth: [basic],
  healthChecks: [service, quota, requestRate],
} satisfies AppDefinition;
