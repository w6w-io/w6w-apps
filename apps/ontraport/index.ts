/**
 * Ontraport — CRM and marketing automation, over the Ontraport API v1
 * (`api.ontraport.com`).
 *
 * Every path, verb, header name, parameter and object-type number in this app
 * was verified on 2026-09-05 against Ontraport's own reference document
 * (`https://api.ontraport.com/doc/`, a Slate-generated page, 2,760,600
 * bytes, `<title>Ontraport API</title>`) plus live probes against
 * `api.ontraport.com` and `ontraport.statuspage.io`. Nothing here came from a
 * third-party integration directory.
 *
 * Three findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **Every record is a numbered "object type"** (`lib/client.ts`). A
 *     contact is object type 0, a task is 1, and so on for ~60 types. Most
 *     have their own dedicated endpoint too (`/Contact(s)`, `/Tags`, ...);
 *     this app uses those wherever one exists, and only reaches for the
 *     generic `/objects` family for tag-by-name application and for
 *     Sequences, which have no dedicated endpoint at all.
 *  2. **Tasks cannot be created or deleted through the API** (`actions/
 *     task-*.ts`). Ontraport's own permission table grants Task (object type
 *     1) only GET and PUT — confirmed structurally, not by omission, and
 *     matching the reference doc's Tasks section, which has no "create" or
 *     "delete" heading at all.
 *  3. **An authentication failure is not JSON** (`lib/client.ts`,
 *     `auth/api-key.ts`). Despite the doc's claim that "all responses will be
 *     JSON-encoded regardless of request method", a bad `Api-Key`/`Api-Appid`
 *     pair answers `401` with `content-type: text/html` and the plain-text
 *     body `"Your App ID and API Key do not authenticate."` — no `code`, no
 *     structured error at all. Classification is a text match, not a status
 *     code or a vendor error field, because there is no vendor error field.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import contactList from "./actions/contact-list.ts";
import contactGet from "./actions/contact-get.ts";
import contactCreate from "./actions/contact-create.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactDelete from "./actions/contact-delete.ts";
import contactMerge from "./actions/contact-merge.ts";

import taskList from "./actions/task-list.ts";
import taskGet from "./actions/task-get.ts";
import taskUpdate from "./actions/task-update.ts";
import taskAssign from "./actions/task-assign.ts";
import taskCancel from "./actions/task-cancel.ts";
import taskComplete from "./actions/task-complete.ts";
import taskReschedule from "./actions/task-reschedule.ts";

import tagList from "./actions/tag-list.ts";
import tagGet from "./actions/tag-get.ts";
import tagCreate from "./actions/tag-create.ts";
import tagUpdate from "./actions/tag-update.ts";
import tagDelete from "./actions/tag-delete.ts";
import tagApply from "./actions/tag-apply.ts";
import tagRemove from "./actions/tag-remove.ts";

import campaignList from "./actions/campaign-list.ts";
import campaignGet from "./actions/campaign-get.ts";

import sequenceList from "./actions/sequence-list.ts";
import sequenceGet from "./actions/sequence-get.ts";

import transactionList from "./actions/transaction-list.ts";
import transactionGet from "./actions/transaction-get.ts";

import orderList from "./actions/order-list.ts";
import orderGet from "./actions/order-get.ts";
import orderDelete from "./actions/order-delete.ts";

import purchaseList from "./actions/purchase-list.ts";
import purchaseGet from "./actions/purchase-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // Contacts
    contactList,
    contactGet,
    contactCreate,
    contactUpdate,
    contactDelete,
    contactMerge,
    // Tasks
    taskList,
    taskGet,
    taskUpdate,
    taskAssign,
    taskCancel,
    taskComplete,
    taskReschedule,
    // Tags
    tagList,
    tagGet,
    tagCreate,
    tagUpdate,
    tagDelete,
    tagApply,
    tagRemove,
    // Campaigns (automations)
    campaignList,
    campaignGet,
    // Sequences
    sequenceList,
    sequenceGet,
    // Transactions
    transactionList,
    transactionGet,
    // Orders
    orderList,
    orderGet,
    orderDelete,
    // Purchases
    purchaseList,
    purchaseGet,
  ],
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
