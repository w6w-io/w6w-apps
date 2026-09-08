import type { Param } from "@w6w/types";

/**
 * Shared `Param` fragments for the Moneybird actions.
 *
 * Every field name and enum here is copied from the vendor's OpenAPI document
 * (see `lib/client.ts`'s module doc for provenance), not inferred.
 */

/**
 * Lets a single call target an administration other than the one the
 * Connection resolved at connect time. Optional everywhere — see
 * {@link resolveAdministrationId} in `lib/client.ts`.
 */
export const administrationIdParam: Param = {
  key: "administrationId",
  label: "Administration ID",
  type: "string",
  advanced: true,
  hint: "Defaults to the administration this connection resolved when it was connected. Override " +
    "only if this credential can reach more than one administration and you need a different one " +
    '— see "List Administrations".',
};

export const idParam = (label: string): Param => ({
  key: "id",
  label,
  type: "string",
  required: true,
});

/** `page` / `per_page` — every list endpoint's pagination pair. Max `per_page` is 100. */
export function paginationParams(): Param[] {
  return [
    {
      key: "page",
      label: "Page",
      type: "number",
      default: 1,
      validation: { integer: true, min: 1 },
    },
    {
      key: "perPage",
      label: "Per page",
      type: "number",
      default: 50,
      validation: { integer: true, min: 1, max: 100 },
      hint: "Moneybird's own default is 50, maximum is 100.",
    },
  ];
}

/** `delivery_method` on a Contact — one of Moneybird's five documented values. */
export const deliveryMethodOptions = [
  { value: "Email", label: "Email" },
  { value: "Simplerinvoicing", label: "Simplerinvoicing" },
  { value: "Peppol", label: "Peppol" },
  { value: "Manual", label: "Manual" },
  { value: "Post", label: "Post" },
];

/** `sales_invoice_sending.delivery_method` — a narrower set than a Contact's own. */
export const sendingDeliveryMethodOptions = [
  { value: "Email", label: "Email" },
  { value: "Peppol", label: "Peppol" },
  { value: "Manual", label: "Manual" },
];

/** `payment.manual_payment_action` on the payments-create endpoint. */
export const manualPaymentActionOptions = [
  { value: "private_payment", label: "Private payment (needs Financial account ID)" },
  { value: "payment_without_proof", label: "Payment without proof" },
  { value: "cash_payment", label: "Cash payment (needs Financial account ID)" },
  { value: "rounding_error", label: "Rounding error" },
  { value: "bank_transfer", label: "Bank transfer (needs Financial mutation ID)" },
  { value: "balance_settlement", label: "Balance settlement (needs Ledger account ID)" },
  { value: "invoices_settlement", label: "Invoices settlement (needs Invoice ID)" },
];

/**
 * The contact fields this app exposes on create/update — the subset of
 * Moneybird's `contact` request body this app has verified end to end.
 * Deliberately excludes SEPA direct-debit fields, custom fields and
 * si_identifier/e-invoicing fields, none of which this app's actions read
 * back or validate; see the README's "Gaps" section.
 */
export function contactFieldParams(): Param[] {
  return [
    {
      key: "companyName",
      label: "Company name",
      type: "string",
      hint: "A contact requires a non-blank company name, or a first and last name.",
    },
    { key: "firstname", label: "First name", type: "string" },
    { key: "lastname", label: "Last name", type: "string" },
    { key: "address1", label: "Address line 1", type: "string" },
    { key: "address2", label: "Address line 2", type: "string" },
    { key: "zipcode", label: "Zip code", type: "string" },
    { key: "city", label: "City", type: "string" },
    { key: "country", label: "Country", type: "string", hint: "ISO two-character code, e.g. NL." },
    { key: "phone", label: "Phone", type: "string" },
    {
      key: "deliveryMethod",
      label: "Delivery method",
      type: "select",
      options: deliveryMethodOptions,
    },
    {
      key: "customerId",
      label: "Customer ID",
      type: "string",
      hint: "Assigned automatically if left empty. Must be unique within the administration.",
    },
    {
      key: "taxNumber",
      label: "Tax number",
      type: "string",
      hint: "VAT number, e.g. NL123456789B01.",
    },
    { key: "chamberOfCommerce", label: "Chamber of Commerce number", type: "string" },
    {
      key: "bankAccount",
      label: "Bank account (IBAN)",
      type: "string",
      hint: "Used for outgoing payments and shown on documents.",
    },
    {
      key: "sendInvoicesToEmail",
      label: "Send invoices to (email)",
      type: "string",
      hint: "One or more email addresses, comma-separated. Overrides the contact's own address " +
        "for invoice delivery.",
    },
    {
      key: "sendEstimatesToEmail",
      label: "Send estimates to (email)",
      type: "string",
      hint: "One or more email addresses, comma-separated.",
    },
  ];
}

export interface ContactFieldInput {
  companyName?: string;
  firstname?: string;
  lastname?: string;
  address1?: string;
  address2?: string;
  zipcode?: string;
  city?: string;
  country?: string;
  phone?: string;
  deliveryMethod?: string;
  customerId?: string;
  taxNumber?: string;
  chamberOfCommerce?: string;
  bankAccount?: string;
  sendInvoicesToEmail?: string;
  sendEstimatesToEmail?: string;
}

/** Map {@link contactFieldParams}' camelCase input to Moneybird's snake_case `contact` body. */
export function contactBody(input: ContactFieldInput): Record<string, unknown> {
  return {
    company_name: input.companyName,
    firstname: input.firstname,
    lastname: input.lastname,
    address1: input.address1,
    address2: input.address2,
    zipcode: input.zipcode,
    city: input.city,
    country: input.country,
    phone: input.phone,
    delivery_method: input.deliveryMethod,
    customer_id: input.customerId,
    tax_number: input.taxNumber,
    chamber_of_commerce: input.chamberOfCommerce,
    bank_account: input.bankAccount,
    send_invoices_to_email: input.sendInvoicesToEmail,
    send_estimates_to_email: input.sendEstimatesToEmail,
  };
}
