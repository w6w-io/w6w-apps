import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, compact, PaddleClient } from "../lib/client.ts";
import { customDataParam, itemTypeOptions } from "../lib/params.ts";

/**
 * `POST /prices` — attach a price to a product.
 *
 * ## Amounts are strings in the currency's lowest denomination
 *
 * Paddle's `unit_price.amount` is documented as "Amount in the lowest
 * denomination for the currency, e.g. 10 USD = 1000 (cents). Although
 * represented as a string, this value must be a valid integer." So $10.00 is
 * `"1000"`, not `10` and not `"10.00"`. The param is therefore typed `string`
 * with an integer pattern rather than `number` — a float would be silently
 * wrong by two orders of magnitude, and JSON-encoding a JS number would drop
 * the string form Paddle requires.
 *
 * ## Recurring vs one-time is the presence of `billing_cycle`
 *
 * There is no "type" switch. A price with a `billing_cycle` recurs; one without
 * is a one-time charge. Omitting the interval and frequency is how you say
 * "one-time", which is why they are separate optional params rather than a
 * required object.
 *
 * Quantity limits default to a minimum of 1 and a maximum of 100 when omitted —
 * Paddle's own default, restated in the hint because a 101-unit purchase
 * failing is otherwise mystifying.
 */
interface Input {
  productId: string;
  description: string;
  amount: string;
  currencyCode: string;
  name?: string;
  type?: string;
  billingCycleInterval?: string;
  billingCycleFrequency?: number;
  trialInterval?: string;
  trialFrequency?: number;
  quantityMinimum?: number;
  quantityMaximum?: number;
  taxMode?: string;
  customData?: unknown;
}

const intervalOptions = [
  { value: "day", label: "Day" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

const priceCreate: ActionDefinition<Input> = {
  key: "price-create",
  type: "perform",
  resource: "price",
  title: "Create Price",
  description:
    "Create a price for a product. Include a billing cycle for a subscription price, or omit it " +
    "for a one-time charge.",
  idempotent: false,
  params: [
    {
      key: "productId",
      label: "Product ID",
      type: "string",
      required: true,
      validation: { pattern: "^pro_[a-z0-9]{26}$" },
    },
    {
      key: "description",
      label: "Internal description",
      type: "string",
      required: true,
      validation: { minLength: 2, maxLength: 500 },
      hint: "Notes for your team. Not shown to customers.",
    },
    {
      key: "amount",
      label: "Amount",
      type: "string",
      required: true,
      placeholder: "1000",
      validation: { pattern: "^-?\\d+$" },
      hint: "In the currency's lowest denomination, as an integer string — 10 USD is `1000`.",
    },
    {
      key: "currencyCode",
      label: "Currency",
      type: "string",
      required: true,
      placeholder: "USD",
      validation: { pattern: "^[A-Z]{3}$" },
      hint: "Three-letter ISO 4217 code. Must be one your Paddle account supports.",
    },
    {
      key: "name",
      label: "Name",
      type: "string",
      validation: { minLength: 1, maxLength: 150 },
      hint: "Shown to customers at checkout and on invoices — typically how often it bills.",
    },
    { key: "type", label: "Type", type: "select", options: itemTypeOptions },
    {
      key: "billingCycleInterval",
      label: "Billing cycle interval",
      type: "select",
      options: intervalOptions,
      hint: "Leave both billing-cycle fields empty for a one-time price.",
    },
    {
      key: "billingCycleFrequency",
      label: "Billing cycle frequency",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "How many intervals — `3` with `month` bills quarterly.",
    },
    {
      key: "trialInterval",
      label: "Trial interval",
      type: "select",
      options: intervalOptions,
      hint: "Requires a billing cycle.",
    },
    {
      key: "trialFrequency",
      label: "Trial frequency",
      type: "number",
      validation: { integer: true, min: 1 },
    },
    {
      key: "quantityMinimum",
      label: "Minimum quantity",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Paddle defaults to 1 when both quantity fields are omitted.",
    },
    {
      key: "quantityMaximum",
      label: "Maximum quantity",
      type: "number",
      validation: { integer: true, min: 1 },
      hint: "Paddle defaults to 100 when both quantity fields are omitted.",
    },
    {
      key: "taxMode",
      label: "Tax mode",
      type: "select",
      options: [
        { value: "account_setting", label: "Account setting (default)" },
        { value: "internal", label: "Internal — amount is inclusive of tax" },
        { value: "external", label: "External — tax is added to the amount" },
      ],
    },
    customDataParam,
  ],
  output: [{ key: "data", type: "object", label: "The created price" }],

  execute(input, ctx) {
    const billingCycle = input.billingCycleInterval && input.billingCycleFrequency
      ? { interval: input.billingCycleInterval, frequency: input.billingCycleFrequency }
      : undefined;
    const trialPeriod = input.trialInterval && input.trialFrequency
      ? { interval: input.trialInterval, frequency: input.trialFrequency }
      : undefined;
    // Both bounds are sent together or not at all: Paddle's documented defaults
    // (1 and 100) only apply when the whole `quantity` object is absent, so
    // sending half of it would pin the other half to a default the caller never
    // chose.
    const quantity = input.quantityMinimum !== undefined || input.quantityMaximum !== undefined
      ? compact({ minimum: input.quantityMinimum, maximum: input.quantityMaximum })
      : undefined;

    return new PaddleClient(ctx).request("/prices", {
      method: "POST",
      body: compact({
        product_id: input.productId,
        description: input.description,
        name: input.name,
        type: input.type,
        unit_price: { amount: input.amount, currency_code: input.currencyCode },
        billing_cycle: billingCycle,
        trial_period: trialPeriod,
        quantity,
        tax_mode: input.taxMode,
        custom_data: asOptionalJson(input.customData, "Custom data"),
      }),
    });
  },
};

export default priceCreate;
