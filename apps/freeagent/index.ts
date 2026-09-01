/**
 * FreeAgent — UK small-business accounting: contacts, invoices, expenses,
 * bank transactions, timeslips, projects, tasks and users, against the
 * Company API (`api.freeagent.com/v2`, confirmed at `dev.freeagent.com/docs`).
 *
 * Three things shape the code and are worth reading before changing it:
 *
 *   - **Related resources are referenced by full URL, not a bare id.** A
 *     timeslip's `task` field is `"https://api.freeagent.com/v2/tasks/2"`,
 *     never `2` — confirmed on every create/update payload across Contacts,
 *     Projects, Tasks, Timeslips and Invoices. Every action param that names
 *     a related resource takes a bare id and `lib/client.ts`'s `ref()`
 *     builds the URL the API actually expects.
 *   - **Task creation takes its parent as a query param, not a body field**
 *     (`POST /v2/tasks?project=:project`) — the one place this pattern
 *     breaks from every other "create under a parent" endpoint in the API.
 *     See `actions/task-create.ts`'s doc comment.
 *   - **A refreshed access token comes back with a NEW refresh token too.**
 *     See `auth/oauth2.ts`'s doc comment — an implementation that reuses the
 *     old refresh token works until FreeAgent invalidates it, then looks like
 *     an unrelated outage.
 *
 * Two of the vendor's own OpenAPI-adjacent docs pages contain outright
 * copy-paste bugs, found by cross-checking every documented endpoint rather
 * than trusting each page in isolation:
 *
 *   - `docs/tasks` documents "Delete a task" as `DELETE /v2/users/:id` — this
 *     app deletes at `/v2/tasks/:id` instead, the path every other task
 *     endpoint on that same page actually uses.
 *   - `docs/bank_transactions` documents "Delete a bank transaction
 *     explanation" at the singular, non-existent `/v2/bank_transaction/:id`;
 *     the correct plural path lives on `docs/bank_transaction_explanations`
 *     instead. This app implements neither delete — bank transaction
 *     explanations are out of scope for this first pass — but the mismatch
 *     is recorded here so a future addition doesn't copy the broken path.
 *
 * Deliberately absent: credit notes, estimates, bills, capital assets,
 * payroll, sales tax returns, attachments (multipart upload, which the
 * sandbox's `ctx.fetch` is not for) and the separate Accountancy Practice
 * API — all real FreeAgent resources, left out to keep this first pass to
 * the core accounting and time-tracking actions most workflows need first.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import contactList from "./actions/contact-list.ts";
import contactGet from "./actions/contact-get.ts";
import contactCreate from "./actions/contact-create.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactDelete from "./actions/contact-delete.ts";

import invoiceList from "./actions/invoice-list.ts";
import invoiceGet from "./actions/invoice-get.ts";
import invoiceCreate from "./actions/invoice-create.ts";
import invoiceUpdate from "./actions/invoice-update.ts";
import invoiceSendEmail from "./actions/invoice-send-email.ts";

import expenseList from "./actions/expense-list.ts";
import expenseGet from "./actions/expense-get.ts";
import expenseCreate from "./actions/expense-create.ts";

import bankTransactionList from "./actions/bank-transaction-list.ts";
import bankTransactionGet from "./actions/bank-transaction-get.ts";

import timeslipList from "./actions/timeslip-list.ts";
import timeslipGet from "./actions/timeslip-get.ts";
import timeslipCreate from "./actions/timeslip-create.ts";
import timeslipUpdate from "./actions/timeslip-update.ts";
import timeslipDelete from "./actions/timeslip-delete.ts";

import projectList from "./actions/project-list.ts";
import projectGet from "./actions/project-get.ts";
import projectCreate from "./actions/project-create.ts";

import taskList from "./actions/task-list.ts";
import taskGet from "./actions/task-get.ts";
import taskCreate from "./actions/task-create.ts";

import userList from "./actions/user-list.ts";
import userGet from "./actions/user-get.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // contact
    contactList,
    contactGet,
    contactCreate,
    contactUpdate,
    contactDelete,
    // invoice
    invoiceList,
    invoiceGet,
    invoiceCreate,
    invoiceUpdate,
    invoiceSendEmail,
    // expense
    expenseList,
    expenseGet,
    expenseCreate,
    // bank transaction
    bankTransactionList,
    bankTransactionGet,
    // timeslip
    timeslipList,
    timeslipGet,
    timeslipCreate,
    timeslipUpdate,
    timeslipDelete,
    // project
    projectList,
    projectGet,
    projectCreate,
    // task
    taskList,
    taskGet,
    taskCreate,
    // user
    userList,
    userGet,
  ],
  auth: [oauth2],
  healthChecks: [service, quota],
} satisfies AppDefinition;
