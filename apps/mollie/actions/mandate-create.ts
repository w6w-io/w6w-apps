import type { ActionDefinition } from "@w6w/types";
import { compact, MollieClient } from "../lib/client.ts";
import { customerIdParam, testmodeParam } from "../lib/params.ts";

/**
 * `POST /v2/customers/{id}/mandates` — register a mandate directly (SEPA
 * Direct Debit or PayPal) without a first payment. `method` and
 * `consumerName` are always required; which of `consumerAccount` (SEPA IBAN)
 * vs `consumerEmail`/`paypalBillingAgreementId`/`payPalVaultId` (PayPal) is
 * required depends on `method`.
 */
interface Input {
  customerId: string;
  method: "directdebit" | "paypal" | "creditcard";
  consumerName: string;
  consumerAccount?: string;
  consumerBic?: string;
  consumerEmail?: string;
  signatureDate?: string;
  mandateReference?: string;
  paypalBillingAgreementId?: string;
  payPalVaultId?: string;
  testmode?: boolean;
}

const mandateCreate: ActionDefinition<Input> = {
  key: "mandate-create",
  type: "perform",
  resource: "mandate",
  title: "Create Mandate",
  description:
    "Register a SEPA Direct Debit or PayPal mandate directly, without a first payment. " +
    "Required fields differ by method — SEPA needs consumerAccount (IBAN); PayPal needs " +
    "consumerEmail plus a billing-agreement or vault ID.",
  idempotent: false,
  params: [
    customerIdParam(),
    {
      key: "method",
      label: "Method",
      type: "select",
      required: true,
      options: [
        { label: "SEPA Direct Debit", value: "directdebit" },
        { label: "PayPal", value: "paypal" },
        { label: "Credit card (rarely creatable directly)", value: "creditcard" },
      ],
      hint: "Mollie's own docs say only \"SEPA Direct Debit and PayPal mandates can be created " +
        'directly" — a credit-card mandate is normally established via a `first` payment instead.',
    },
    { key: "consumerName", label: "Consumer name", type: "string", required: true },
    {
      key: "consumerAccount",
      label: "Consumer IBAN",
      type: "string",
      hint: "Required for SEPA Direct Debit mandates.",
    },
    { key: "consumerBic", label: "Consumer BIC", type: "string", advanced: true },
    {
      key: "consumerEmail",
      label: "Consumer email",
      type: "string",
      hint: "Required for PayPal mandates.",
    },
    {
      key: "signatureDate",
      label: "Signature date",
      type: "date",
      advanced: true,
      hint: "YYYY-MM-DD.",
    },
    {
      key: "mandateReference",
      label: "Mandate reference",
      type: "string",
      advanced: true,
      hint: "Custom reference. Vital to keep unique for SEPA Direct Debit.",
    },
    {
      key: "paypalBillingAgreementId",
      label: "PayPal billing agreement ID",
      type: "string",
      advanced: true,
    },
    { key: "payPalVaultId", label: "PayPal vault ID", type: "string", advanced: true },
    testmodeParam,
  ],
  output: [
    { key: "id", type: "string", label: "Mandate ID (mdt_*)" },
    { key: "status", type: "string", label: "Status" },
    { key: "method", type: "string", label: "Method" },
  ],

  async execute(input, ctx) {
    return await new MollieClient(ctx).post(
      `/customers/${encodeURIComponent(input.customerId)}/mandates`,
      compact({
        method: input.method,
        consumerName: input.consumerName,
        consumerAccount: input.consumerAccount,
        consumerBic: input.consumerBic,
        consumerEmail: input.consumerEmail,
        signatureDate: input.signatureDate,
        mandateReference: input.mandateReference,
        paypalBillingAgreementId: input.paypalBillingAgreementId,
        payPalVaultId: input.payPalVaultId,
        testmode: input.testmode,
      }),
    );
  },
};

export default mandateCreate;
