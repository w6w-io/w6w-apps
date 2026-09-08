import type { AppDefinition } from "@w6w/types";

import administrationList from "./actions/administration-list.ts";
import contactCreate from "./actions/contact-create.ts";
import contactGet from "./actions/contact-get.ts";
import contactList from "./actions/contact-list.ts";
import contactUpdate from "./actions/contact-update.ts";
import salesInvoiceCreate from "./actions/sales-invoice-create.ts";
import salesInvoiceGet from "./actions/sales-invoice-get.ts";
import salesInvoiceList from "./actions/sales-invoice-list.ts";
import salesInvoicePaymentCreate from "./actions/sales-invoice-payment-create.ts";
import salesInvoicePdfGet from "./actions/sales-invoice-pdf-get.ts";
import salesInvoiceSend from "./actions/sales-invoice-send.ts";

import oauth2 from "./auth/oauth2.ts";
import personalToken from "./auth/personal-token.ts";

import service from "./health/service.ts";

export default {
  actions: [
    administrationList,
    contactList,
    contactGet,
    contactCreate,
    contactUpdate,
    salesInvoiceList,
    salesInvoiceGet,
    salesInvoiceCreate,
    salesInvoiceSend,
    salesInvoicePaymentCreate,
    salesInvoicePdfGet,
  ],
  auth: [personalToken, oauth2],
  healthChecks: [service],
} satisfies AppDefinition;
