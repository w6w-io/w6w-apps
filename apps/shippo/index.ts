/**
 * Shippo — rate a parcel across every carrier account on the connection, buy
 * the label, track it to the door, validate addresses before they cost a
 * return, and refund what wasn't used.
 *
 * See `lib/client.ts` for the shape everything rests on: rating is a side
 * effect of creating a shipment, and buying a label is a deliberately
 * separate, second step.
 */
import type { AppDefinition } from "@w6w/types";

import apiKey from "./auth/api-key.ts";

import service from "./health/service.ts";
import account from "./health/account.ts";
import quota from "./health/quota.ts";

import addressCreate from "./actions/address-create.ts";
import addressValidate from "./actions/address-validate.ts";
import parcelCreate from "./actions/parcel-create.ts";
import shipmentCreate from "./actions/shipment-create.ts";
import shipmentGet from "./actions/shipment-get.ts";
import shipmentList from "./actions/shipment-list.ts";
import rateGet from "./actions/rate-get.ts";
import transactionCreate from "./actions/transaction-create.ts";
import transactionGet from "./actions/transaction-get.ts";
import transactionList from "./actions/transaction-list.ts";
import trackCreate from "./actions/track-create.ts";
import trackGet from "./actions/track-get.ts";
import refundCreate from "./actions/refund-create.ts";
import carrierAccountList from "./actions/carrier-account-list.ts";

const app: AppDefinition = {
  actions: [
    addressCreate,
    addressValidate,
    parcelCreate,
    shipmentCreate,
    shipmentGet,
    shipmentList,
    rateGet,
    transactionCreate,
    transactionGet,
    transactionList,
    trackCreate,
    trackGet,
    refundCreate,
    carrierAccountList,
  ],
  auth: [apiKey],
  healthChecks: [service, account, quota],
};

export default app;
