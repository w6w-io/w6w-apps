import type { ActionDefinition } from "@w6w/types";
import { ZuoraClient } from "../lib/client.ts";

interface Input {
  accountKey: string;
}

/**
 * `GET /v1/accounts/{account-key}` — verified against
 * `developer.zuora.com/v1-api-reference/api/accounts/get_account`.
 *
 * A "quick" retrieval: basic info, bill-to/sold-to/ship-to contacts and
 * billing/payment setup, but NOT the account's subscriptions, invoices,
 * payments or usage — Zuora's own docs point to "Retrieve an account summary"
 * (`GET /v1/accounts/{account-key}/summary`) for that, which is deliberately
 * left out of this app: it truncates to the six most recent subscriptions and
 * is meant for a human dashboard rather than a workflow, which can call
 * `subscription-list` / `invoice-list` / `payment-list` filtered by account
 * instead and get the whole set.
 *
 * `account-key` accepts either the account's Id or its Account Number.
 */
const action: ActionDefinition<Input> = {
  key: "account-get",
  type: "read",
  resource: "account",
  title: "Get Account",
  description: "Retrieve a customer account's basic info, contacts and billing/payment setup.",
  params: [
    {
      key: "accountKey",
      label: "Account Key",
      type: "string",
      required: true,
      hint: "The account's Id or Account Number.",
    },
  ],
  output: [{ key: "account", type: "object", label: "Account" }],

  async execute(input, ctx) {
    const client = new ZuoraClient(ctx);
    const account = await client.request(`/v1/accounts/${encodeURIComponent(input.accountKey)}`);
    return { account };
  },
};

export default action;
