import type { ActionDefinition } from "@w6w/types";
import { asOptionalJson, type BrexCard, BrexClient, compact, encodeId } from "../lib/client.ts";
import { cardIdParam, idempotencyKeyParam, spendDurationOptions } from "../lib/params.ts";

/**
 * `PUT /v2/cards/{id}` — update a vendor card's spend controls and metadata.
 *
 * ## "Vendor card" is load-bearing
 *
 * Brex's own endpoint summary: "Update an existing vendor card." A vendor card is
 * the one whose `limit_type` is `CARD` — which is also the only kind that has
 * `spend_controls` at all. On a corporate card (`limit_type = USER`) the limit
 * belongs to the user, so this endpoint is not the way to change it.
 *
 * ## Money is in the currency's smallest unit
 *
 * Brex, verbatim: "The amount of money will be represented in the smallest
 * denomination of the currency indicated. For example, USD 7.00 will be
 * represented in cents with an amount of 700." So `spendLimitAmount` is cents
 * for USD — a `$5,000` monthly cap is `500000`, and entering `5000` sets a
 * `$50.00` limit. The param says so in its own hint as well.
 *
 * ## The merchant lists are mutually exclusive
 *
 * Brex: allowed and blocked "cannot be used together", and each accepts a maximum
 * of 50 merchants. Both rules are enforced here rather than passed on as a
 * vendor `400`, because the request is wrong before it is sent.
 *
 * ## Idempotent
 *
 * `PUT` with unset fields left unchanged, so the same input always lands on the
 * same card state.
 */
interface Input {
  id: string;
  spendLimitAmount?: number;
  spendLimitCurrency?: string;
  spendDuration?: string;
  spendReason?: string;
  lockAfterDate?: string;
  allowedMerchants?: unknown;
  blockedMerchants?: unknown;
  metadata?: unknown;
  idempotencyKey?: string;
}

/**
 * Brex's maximum per merchant list. Documented, not guessed: "Maximum 50
 * merchant details."
 */
export const MAX_MERCHANTS = 50;

/** Validate one merchant list into the `[{"name": "…"}]` shape Brex documents. */
export function merchantList(value: unknown, label: string): Array<{ name: string }> | undefined {
  const parsed = asOptionalJson<unknown>(value, label);
  if (parsed === undefined) return undefined;
  if (!Array.isArray(parsed)) {
    throw new Error(`${label} must be a JSON array of objects, e.g. [{"name": "Github"}]`);
  }
  if (parsed.length > MAX_MERCHANTS) {
    throw new Error(
      `${label} carries ${parsed.length} merchants; Brex accepts at most ${MAX_MERCHANTS}`,
    );
  }
  return parsed.map((entry, index) => {
    const name = (entry as { name?: unknown } | null)?.name;
    if (typeof name !== "string" || name.trim() === "") {
      throw new Error(`${label}[${index}] must be an object with a non-empty "name"`);
    }
    return { name: name.trim() };
  });
}

/** Build `spend_controls`, or nothing at all when no field was set. */
export function buildSpendControls(input: Input): Record<string, unknown> | undefined {
  const allowed = merchantList(input.allowedMerchants, "Allowed merchants");
  const blocked = merchantList(input.blockedMerchants, "Blocked merchants");
  if (allowed && blocked) {
    throw new Error(
      "Brex does not accept allowed and blocked merchants together: send one list or the other",
    );
  }
  if (input.spendLimitCurrency !== undefined && input.spendLimitAmount === undefined) {
    throw new Error(
      "Spend limit currency needs a spend limit amount: Brex requires `amount` inside spend_limit",
    );
  }

  const controls = compact({
    spend_limit: input.spendLimitAmount === undefined
      ? undefined
      : compact({ amount: input.spendLimitAmount, currency: input.spendLimitCurrency }),
    spend_duration: input.spendDuration,
    reason: input.spendReason,
    lock_after_date: input.lockAfterDate,
    allowed_merchant_details: allowed,
    blocked_merchant_details: blocked,
  });
  return Object.keys(controls).length > 0 ? controls : undefined;
}

const cardUpdate: ActionDefinition<Input> = {
  key: "card-update",
  type: "perform",
  resource: "card",
  title: "Update Card",
  description:
    "Update a vendor card's spend limit, refresh window, reason, lock-after date, merchant " +
    "allow/deny list and metadata. Fields left empty are unchanged.",
  idempotent: true,
  params: [
    cardIdParam,
    {
      key: "spendLimitAmount",
      label: "Spend limit (smallest currency unit)",
      type: "number",
      validation: { integer: true },
      hint:
        "Brex's `spend_controls.spend_limit.amount`, in the currency's smallest unit — USD cents. " +
        "A $5,000 limit is 500000, and entering 5000 sets $50.00.",
    },
    {
      key: "spendLimitCurrency",
      label: "Spend limit currency",
      type: "string",
      placeholder: "USD",
      row: "spend-limit",
      hint: "ISO 4217, e.g. `USD`. Needs a spend limit amount.",
    },
    {
      key: "spendDuration",
      label: "Limit refresh",
      type: "select",
      options: spendDurationOptions,
    },
    {
      key: "spendReason",
      label: "Reason",
      type: "string",
      hint: "Brex's `spend_controls.reason` — free text, shown against the card's limit.",
    },
    {
      key: "lockAfterDate",
      label: "Lock after date",
      type: "date",
      hint: "Brex's `spend_controls.lock_after_date`. The card locks itself after this date.",
    },
    {
      key: "allowedMerchants",
      label: "Allowed merchants",
      type: "json",
      advanced: true,
      hint: 'JSON array of the only merchants this card may use, e.g. `[{"name": "Github"}, ' +
        '{"name": "AWS"}]`. Cannot be combined with Blocked merchants. Maximum 50 entries.',
    },
    {
      key: "blockedMerchants",
      label: "Blocked merchants",
      type: "json",
      advanced: true,
      hint:
        'JSON array of merchants this card may not use, e.g. `[{"name": "Apple"}]`. Cannot be ' +
        "combined with Allowed merchants. Maximum 50 entries.",
    },
    {
      key: "metadata",
      label: "Metadata",
      type: "json",
      advanced: true,
      hint: "JSON object of your own attributes. Brex allows at most 50 keys, keys under 40 " +
        "characters and values under 500, and asks that nothing personally identifiable is " +
        "stored here.",
    },
    idempotencyKeyParam,
  ],
  output: [
    { key: "id", type: "string", label: "Card id" },
    { key: "owner", type: "object", label: "Card owner" },
    { key: "status", type: "string", label: "Status" },
    { key: "last_four", type: "string", label: "Last four digits" },
    { key: "card_name", type: "string", label: "Card name" },
    { key: "card_type", type: "string", label: "Card type" },
    { key: "limit_type", type: "string", label: "Limit type" },
    { key: "spend_controls", type: "object", label: "Spend controls after the update" },
    { key: "metadata", type: "object", label: "Metadata" },
  ],

  execute(input, ctx) {
    return new BrexClient(ctx).json<BrexCard>(`/cards/${encodeId(input.id)}`, {
      method: "PUT",
      idempotencyKey: input.idempotencyKey,
      body: compact({
        spend_controls: buildSpendControls(input),
        metadata: asOptionalJson<Record<string, unknown>>(input.metadata, "Metadata"),
      }),
    });
  },
};

export default cardUpdate;
