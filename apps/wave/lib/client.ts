import type { HookContext } from "@w6w/types";

/**
 * Wave is GraphQL-only. There is no REST surface: every call is a POST to this
 * one endpoint with a `{ query, variables }` JSON body.
 *
 * Confirmed on the wire — an unauthenticated introspection query against this
 * URL answers HTTP 200 with real schema data (Wave's endpoint does not require
 * a credential to introspect), and every field, argument, enum value and input
 * type referenced anywhere in this app was read directly off that schema
 * rather than assumed from the documentation, which is a hand-maintained
 * summary and — like most vendor docs — narrower than the schema itself (see
 * the README for the specific gaps).
 */
export const API_URL = "https://gql.waveapps.com/graphql/public";

/**
 * A transport-level GraphQL error — the `errors[]` entries beside `data`.
 * Wave's own docs enumerate the `extensions.code` values this app relies on:
 * `GRAPHQL_VALIDATION_FAILED` (malformed query/argument), `NOT_FOUND` (a
 * `business`/`customer`/… id that doesn't resolve), `UNAUTHENTICATED` (missing
 * or expired token) and `INTERNAL_SERVER_ERROR`.
 */
export interface GraphQLError {
  message: string;
  path?: Array<string | number>;
  locations?: Array<{ line: number; column: number }>;
  extensions?: { code?: string; id?: string; [k: string]: unknown };
}

export interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
}

/**
 * A mutation's field-level validation error — the `inputErrors[]` array beside
 * `didSucceed` inside `data`. This is the SECOND, easier-to-miss failure
 * channel: a rejected write still arrives as HTTP 200 with no `errors[]`,
 * `didSucceed: false` and the actual record `null`. See `unwrap`.
 */
export interface InputError {
  path?: string[];
  message: string;
  code?: string;
}

/** Drop variables the caller left unset so they never reach Wave as nulls. */
export function compact<T extends Record<string, unknown>>(vars: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0) continue;
    out[k] = v;
  }
  return out;
}

/** Split a comma-separated form field into a list, or leave it unset. */
export function csv(v: string | undefined): string[] | undefined {
  if (!v) return undefined;
  const items = v.split(",").map((s) => s.trim()).filter(Boolean);
  return items.length ? items : undefined;
}

/**
 * Parse a `type: "json"` param into an object, with a message that names the
 * field rather than letting Wave reject an opaque payload.
 */
export function jsonArg(v: unknown, field: string): Record<string, unknown> | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v === "object") return v as Record<string, unknown>;
  try {
    const parsed = JSON.parse(String(v));
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      throw new Error("not an object");
    }
    return parsed as Record<string, unknown>;
  } catch {
    throw new Error(`${field} must be a JSON object`);
  }
}

/**
 * Parse a `type: "json"` param that's expected to be an ARRAY (a list of
 * line items, for instance), with a message that names the field.
 */
export function jsonArrayArg(v: unknown, field: string): unknown[] | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  if (Array.isArray(v)) return v;
  try {
    const parsed = JSON.parse(String(v));
    if (!Array.isArray(parsed)) throw new Error("not an array");
    return parsed;
  } catch {
    throw new Error(`${field} must be a JSON array`);
  }
}

/**
 * Thin GraphQL client over `ctx.fetch`.
 *
 * It never sets `Authorization` — the runtime routes every request through the
 * auth `sign` hook. Unlike some GraphQL APIs in this pack (Jobber), Wave
 * carries no mandatory version header and no per-request cost envelope — its
 * own docs describe the API as intentionally versionless, evolved by adding
 * fields rather than by breaking existing ones.
 *
 * ## Two failure channels, only one of which is an HTTP status
 *
 * 1. **HTTP status / `errors[]`.** A malformed query, an unresolvable id, or
 *    an expired token all answer HTTP 200 with `errors[]` populated and the
 *    requested field `null` in `data` — verified against Wave's own "Errors"
 *    doc, which documents `GRAPHQL_VALIDATION_FAILED`, `NOT_FOUND`,
 *    `UNAUTHENTICATED` and `INTERNAL_SERVER_ERROR` this way. `send` throws on
 *    this channel.
 * 2. **`inputErrors[]` inside a mutation payload, with HTTP 200 and no
 *    `errors[]`.** Business-rule / field-validation rejections — `didSucceed:
 *    false`, `inputErrors: [{ path, message, code }]`, and the mutated record
 *    itself `null`. `unwrap` closes this channel; every mutation action here
 *    routes through it.
 */
export class WaveClient {
  constructor(private ctx: HookContext) {}

  /** The raw round-trip. Throws on channel (1); leaves channel (2) to `unwrap`. */
  async send<T = unknown>(
    query: string,
    variables: Record<string, unknown> = {},
  ): Promise<GraphQLResponse<T>> {
    const res = await this.ctx.fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify({ query, variables: compact(variables) }),
    });

    const text = await res.text();
    let payload: GraphQLResponse<T>;
    try {
      payload = JSON.parse(text) as GraphQLResponse<T>;
    } catch {
      throw new Error(`Wave ${res.status} ${res.statusText}: non-JSON response`);
    }

    if (payload.errors?.length) {
      const detail = payload.errors.map((e) => e.message).join("; ");
      throw new Error(`Wave GraphQL error: ${detail}`);
    }
    if (!res.ok) throw new Error(`Wave ${res.status} ${res.statusText}: ${text}`);
    if (payload.data === undefined || payload.data === null) {
      throw new Error("Wave returned no data");
    }

    return payload;
  }

  /** The common case: the validated `data` object. */
  async query<T = unknown>(
    query: string,
    variables: Record<string, unknown> = {},
  ): Promise<T> {
    const payload = await this.send<T>(query, variables);
    return payload.data as T;
  }
}

/**
 * Pull a mutation payload out of `data` and fail loudly on `inputErrors`.
 *
 * ```jsonc
 * { "data": { "customerCreate": { "didSucceed": false, "customer": null,
 *     "inputErrors": [{ "code": "REQUIRED", "message": "This field is required.",
 *       "path": ["input", "name"] }] } } }
 * ```
 *
 * Every mutation action routes through here, so a rejected write raises rather
 * than returning a hollow `didSucceed: false`.
 */
export function unwrap<T extends Record<string, unknown>>(
  data: Record<string, unknown> | undefined,
  field: string,
): T {
  const payload = data?.[field] as
    | (T & { didSucceed?: boolean; inputErrors?: InputError[] })
    | undefined;
  if (!payload) throw new Error(`Wave returned no ${field} payload`);

  const inputErrors = payload.inputErrors ?? [];
  if (payload.didSucceed === false || inputErrors.length) {
    const detail = inputErrors
      .map((e) => (e.path?.length ? `${e.path.join(".")}: ${e.message}` : e.message))
      .join("; ") || "Wave rejected the request";
    throw new Error(`Wave rejected ${field}: ${detail}`);
  }
  return payload;
}

/**
 * Pull a nested field off `data.business`.
 *
 * Almost nothing in Wave's schema is queryable from the root `Query` type
 * directly — customers, products, invoices, estimates and accounts are all
 * fields on `Business`, reached as `business(id: $businessId) { <field> }`.
 * Wave's own schema reference says so explicitly: "objects whose content vary
 * per each Business are usually accessed by nesting inside a Query on
 * Business." A `businessId` that doesn't resolve comes back as `errors[{
 * extensions: { code: "NOT_FOUND" } }]`, which `WaveClient.send` already
 * throws on — so reaching here with `business` still `null`/`undefined` means
 * the shape of the response itself is unexpected, not a bad id.
 */
export function unwrapBusiness<T>(data: Record<string, unknown> | undefined, field: string): T {
  const business = data?.business as Record<string, unknown> | null | undefined;
  if (!business) throw new Error("Wave returned no business object");
  const value = business[field];
  if (value === undefined) throw new Error(`Wave's business object carried no ${field} field`);
  return value as T;
}

/**
 * The limit/offset page envelope every collection query returns.
 *
 * Wave's pagination is NOT cursor-based, unlike most GraphQL APIs — its own
 * "Pagination" doc states it plainly: "Wave uses limit/offset pagination."
 * Pass 1-based `page` and `pageSize`; read `pageInfo.currentPage` and
 * `pageInfo.totalPages` off the response to decide whether to fetch another
 * page. `totalCount` is also available and, unlike Jobber's equivalent field,
 * carries no documented cost warning against using it.
 */
export const PAGE_INFO = `pageInfo { currentPage totalPages totalCount }`;

/** Shared money shape: the display string plus the currency it's in. */
export const MONEY_FIELDS = `value currency { code symbol }`;

export const ADDRESS_FIELDS = `
  addressLine1
  addressLine2
  city
  province { code name }
  country { code name }
  postalCode
`;

export const CUSTOMER_FIELDS = `
  id
  name
  firstName
  lastName
  displayId
  email
  mobile
  phone
  fax
  tollFree
  website
  internalNotes
  currency { code }
  address { ${ADDRESS_FIELDS} }
  createdAt
  modifiedAt
  isArchived
  outstandingAmount { ${MONEY_FIELDS} }
  overdueAmount { ${MONEY_FIELDS} }
`;

export const PRODUCT_FIELDS = `
  id
  name
  description
  unitPrice
  isSold
  isBought
  isArchived
  createdAt
  modifiedAt
  incomeAccount { id name }
  expenseAccount { id name }
`;

export const ACCOUNT_FIELDS = `
  id
  name
  description
  displayId
  currency { code }
  type { name value }
  subtype { name value }
  normalBalanceType
  isArchived
`;

/** Line-item shape shared by invoices and estimates. */
export const ITEM_FIELDS = `
  product { id name }
  description
  quantity
  unitPrice
  subtotal { ${MONEY_FIELDS} }
  total { ${MONEY_FIELDS} }
`;

export const INVOICE_FIELDS = `
  id
  createdAt
  modifiedAt
  pdfUrl
  viewUrl
  status
  title
  subhead
  invoiceNumber
  poNumber
  invoiceDate
  dueDate
  customer { id name }
  currency { code }
  amountDue { ${MONEY_FIELDS} }
  amountPaid { ${MONEY_FIELDS} }
  taxTotal { ${MONEY_FIELDS} }
  total { ${MONEY_FIELDS} }
  subtotal { ${MONEY_FIELDS} }
  exchangeRate
  memo
  footer
  lastSentAt
  lastSentVia
  lastViewedAt
  items { ${ITEM_FIELDS} }
`;

export const ESTIMATE_FIELDS = `
  id
  createdAt
  modifiedAt
  pdfUrl
  viewUrl
  status
  title
  subhead
  estimateNumber
  poNumber
  estimateDate
  dueDate
  customer { id name }
  currency { code }
  amountDue { ${MONEY_FIELDS} }
  amountPaid { ${MONEY_FIELDS} }
  taxTotal { ${MONEY_FIELDS} }
  total { ${MONEY_FIELDS} }
  subtotal { ${MONEY_FIELDS} }
  exchangeRate
  memo
  footer
  lastSentAt
  lastSentVia
  lastViewedAt
  items { ${ITEM_FIELDS} }
`;
