import type { HookContext } from "@w6w/types";

/**
 * Pipefy is GraphQL-only. There is no REST surface: every call is a POST to
 * this one endpoint with a `{ query }` JSON body — confirmed on the wire
 * (`curl -X POST https://api.pipefy.com/graphql` answers a structured
 * `{"errors":[{"title":"Unauthorized", ...}]}` body, not a REST 404, and
 * every one of Pipefy's own reference pages routes through it). Arguments
 * are inlined as GraphQL literals rather than sent as a separate
 * `variables` map — see `gqlLiteral` for why.
 */
export const API_URL = "https://api.pipefy.com/graphql";

/**
 * The Service Account (client-credentials) token endpoint — confirmed on the
 * wire, not merely read off a screenshot. Pipefy's own docs only ever show
 * this URL inside a per-account settings screen ("get the Client ID, Client
 * Secret, and the token endpoint"), which reads as if each Service Account
 * had its own token host. It does not: an unauthenticated POST here answers
 * the standard Doorkeeper/OAuth2 `invalid_client` shape (not a 404 or a
 * redirect to somewhere else), and the `www-authenticate: Bearer
 * realm="Doorkeeper"` header on a rejected GraphQL call names the same
 * engine. This is one fixed endpoint for every Service Account; only the
 * `client_id`/`client_secret` differ per account.
 */
export const TOKEN_URL = "https://app.pipefy.com/oauth/token";

/**
 * A transport-level GraphQL error — the `errors[]` array beside `data`.
 * Pipefy uses TWO different shapes on this channel, both confirmed on the
 * wire:
 *
 *   - A bare, unauthenticated call gets a REST-flavored envelope with no
 *     `data` key at all: `{"errors":[{"title":"Unauthorized","detail":"..."}]}`.
 *   - An invalid/expired bearer token instead gets the standard OAuth2 shape
 *     (`{"error":"invalid_token","error_description":"..."}`) with NEITHER
 *     `data` NOR `errors` — this is not GraphQL-shaped at all, so callers
 *     must check for it before assuming `errors[]` is the only failure shape.
 *   - A well-formed, authenticated request that fails GraphQL validation (a
 *     bad argument, an unknown field, a query over the 50,000 complexity or
 *     15-deep limit) gets the standard `{"message","locations","path"}` shape
 *     documented in Pipefy's own request-handling guide, alongside `data`
 *     with the failed field `null`.
 */
export interface GraphQLError {
  /** Present on a GraphQL validation error (bad argument, unknown field, over a limit). */
  message?: string;
  /** Present instead of `message` on the REST-flavored "you're not logged in" envelope. */
  title?: string;
  detail?: string;
  path?: Array<string | number>;
  locations?: Array<{ line: number; column: number }>;
  extensions?: Record<string, unknown>;
}

export interface GraphQLResponse<T> {
  data?: T;
  errors?: GraphQLError[];
  /** Present only on the OAuth2-flavored bearer-rejection envelope (no `data`/`errors`). */
  error?: string;
  error_description?: string;
}

/** Drop variables/fields the caller left unset so they never reach Pipefy as nulls. */
export function compact<T extends Record<string, unknown>>(vars: T): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined || v === null || v === "") continue;
    if (Array.isArray(v) && v.length === 0) continue;
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
 * Split a comma-separated form field into a list of NUMERIC ids (`ids:
 * [12345, 987654]`), or leave it unset.
 */
export function csvIds(v: string | undefined): number[] | undefined {
  const items = csv(v);
  if (!items) return undefined;
  const ids = items.map((s) => Number(s)).filter((n) => Number.isFinite(n));
  return ids.length ? ids : undefined;
}

/**
 * Parse a `type: "json"` param into an object, with a message that names the
 * field rather than letting Pipefy reject an opaque payload.
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
 * field-attribute pairs, for instance), with a message that names the field.
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
 * Marks a string as a bare GraphQL enum identifier (e.g. `color: green`)
 * rather than a quoted string value (`color: "green"`) — Pipefy's `color`
 * arguments on `updatePipe`/`updatePhase` are unquoted enum identifiers in
 * every one of the vendor's own examples.
 */
export class GqlEnum {
  constructor(public readonly value: string) {}
}
export function gqlEnum(value: string | undefined): GqlEnum | undefined {
  return value ? new GqlEnum(value) : undefined;
}

/**
 * Serialize a JS value as a GraphQL argument LITERAL (not a `$variable`).
 *
 * Why literals rather than typed `$variables`: Pipefy's GraphQL endpoint
 * refuses unauthenticated introspection (confirmed on the wire — `{
 * __typename }` with no token answers the same generic `Unauthorized`
 * envelope as every other unauthenticated call), so the exact name of each
 * mutation's input type (`CreateCardInput`? `card_input`?) cannot be read
 * off the schema, and every example in Pipefy's own reference docs inlines
 * the `input: { ... }` object as a literal rather than declaring a typed
 * variable — this mirrors that, safely, rather than guessing a type name
 * that would make the whole query fail GraphQL validation.
 *
 * A numeric-looking string is emitted UNQUOTED: GraphQL's `ID` scalar
 * accepts either an IntValue or a StringValue literal (the spec is explicit
 * that ID is serialization-format-agnostic), but an `Int` scalar accepts
 * ONLY an IntValue — so emitting `123` rather than `"123"` is the one
 * encoding that satisfies an argument typed either way. A non-numeric string
 * (a table id like `"ZtEdWh"`, a field slug like `"long_text_field"`) is
 * always a `String`/`ID`, so it's quoted.
 */
export function gqlLiteral(value: unknown): string {
  if (value === undefined || value === null) return "null";
  if (value instanceof GqlEnum) return value.value;
  if (typeof value === "boolean" || typeof value === "number") return String(value);
  if (typeof value === "string") {
    return /^-?\d+$/.test(value) ? value : JSON.stringify(value);
  }
  if (Array.isArray(value)) return `[${value.map(gqlLiteral).join(", ")}]`;
  if (typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}: ${gqlLiteral(v)}`);
    return `{ ${entries.join(", ")} }`;
  }
  throw new Error(`cannot serialize a GraphQL literal for ${typeof value}`);
}

/** `gqlLiteral` over an `input:`-shaped object, with `undefined`/`""` keys dropped. */
export function gqlInput(fields: Record<string, unknown>): string {
  return gqlLiteral(compact(fields));
}

/**
 * A bare, comma-joined `key: value` argument list (no wrapping braces) for a
 * query field's own arguments (`cards(pipe_id: 123, first: 20)`), as
 * distinct from `gqlInput`'s `{ ... }` object literal for a mutation's
 * `input:` argument. Returns `""` when every field was unset.
 */
export function gqlArgs(fields: Record<string, unknown>): string {
  const compacted = compact(fields);
  return Object.entries(compacted).map(([k, v]) => `${k}: ${gqlLiteral(v)}`).join(", ");
}

/**
 * Thin GraphQL client over `ctx.fetch`.
 *
 * It never sets `Authorization` — the runtime routes every request through
 * the auth `sign` hook.
 */
export class PipefyClient {
  constructor(private ctx: HookContext) {}

  /**
   * The raw round-trip. Throws on any of the three failure shapes documented
   * above. `variables` is for the `graphql-query` escape hatch, where the
   * caller writes and declares their own query — every action in this app
   * builds its query with inlined `gqlLiteral` arguments instead (see that
   * function's comment for why) and calls this with `variables` omitted.
   */
  async send<T = unknown>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const res = await this.ctx.fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        accept: "application/json",
      },
      body: JSON.stringify(variables ? { query, variables } : { query }),
    });

    const text = await res.text();
    let payload: GraphQLResponse<T>;
    try {
      payload = JSON.parse(text) as GraphQLResponse<T>;
    } catch {
      throw new Error(`Pipefy ${res.status} ${res.statusText}: non-JSON response`);
    }

    if (payload.error) {
      throw new Error(
        `Pipefy rejected the credential: ${payload.error_description ?? payload.error}`,
      );
    }
    if (payload.errors?.length) {
      const detail = payload.errors
        .map((e) => e.message ?? `${e.title ?? "error"}${e.detail ? `: ${e.detail}` : ""}`)
        .join("; ");
      throw new Error(`Pipefy GraphQL error: ${detail}`);
    }
    if (!res.ok) throw new Error(`Pipefy ${res.status} ${res.statusText}: ${text}`);
    if (payload.data === undefined || payload.data === null) {
      throw new Error("Pipefy returned no data");
    }

    return payload.data;
  }
}

/**
 * Pull a mutation payload out of `data` and fail loudly when the mutation's
 * own `success` field is `false` — the shape every delete mutation
 * (`deletePipe`, `deleteCard`, `deleteTableRecord`, …) and `moveCardToPhase`
 * use for a request that Pipefy accepted syntactically but refused to carry
 * out. Unlike Wave, Pipefy does not carry a separate `inputErrors[]`
 * validation channel documented anywhere in its reference — a rejected
 * write is either a top-level `errors[]` entry (`send` already throws on
 * that) or a `success: false` field on the payload.
 */
export function expectSuccess<T extends Record<string, unknown>>(
  data: Record<string, unknown> | undefined,
  field: string,
): T {
  const payload = data?.[field] as (T & { success?: boolean }) | undefined;
  if (!payload) throw new Error(`Pipefy returned no ${field} payload`);
  if (payload.success === false) throw new Error(`Pipefy rejected ${field}`);
  return payload;
}

/**
 * `endCursor` and `totalCount` are the only two connection-envelope fields
 * this app confirmed on the wire (Pipefy's own "Limits and Best Practices"
 * guide selects exactly these two off `organization.tables(first: 10)`).
 * Relay-style connections conventionally also carry `hasNextPage` on
 * `pageInfo`, but no fetched reference page selects it, so it is left off
 * rather than guessed — a list action here stops paging once a page comes
 * back with fewer than `pageSize` edges (or falls back to comparing the
 * running count against `totalCount`), not on a `hasNextPage` flag.
 */
export const PAGE_INFO = `pageInfo { endCursor } totalCount`;

/**
 * Every Pipe field this app's reference pages select, combined from two
 * independent first-party sources: Pipefy's own GraphQL reference
 * (`uuid`, `users_count`, `cards_count`, `opened_cards_count`,
 * `emailAddress`) and Pipefy's own open-source Terraform provider
 * (`pipefy/terraform-provider-pipefy`, `internal/pipefy/pipe.go`), whose
 * `pipeSelection` confirms `public` and `color` (a `Colors` enum, per its
 * own mutation signature) as real, queryable fields.
 */
export const PIPE_FIELDS = `
  id
  uuid
  name
  color
  public
  users_count
  cards_count
  opened_cards_count
  emailAddress
`;

/**
 * Every Phase field this app's reference pages select, combined from
 * Pipefy's own GraphQL reference (`cards_count`) and its Terraform
 * provider's `phaseSelection` (`done`, `description`) — `internal/pipefy/phase.go`.
 */
export const PHASE_FIELDS = `
  id
  name
  done
  description
  cards_count
`;

/**
 * The rich field-value shape from the Cards doc's "Cards Query" /
 * `findCards` examples — the fuller sibling of the plain `{ name value
 * filled_at }` shown in the "Basic"/"Objects Within Cards" examples.
 */
const FIELD_VALUE_SHAPE = `
    date_value
    datetime_value
    filled_at
    float_value
    indexName
    name
    native_value
    report_value
    updated_at
    value
`;

/** Every Card field this app's reference pages select, combined. */
export const CARD_FIELDS = `
  id
  title
  done
  updated_at
  current_phase { id name }
  pipe { id name }
  assignees { name email }
  attachments { url path }
  fields { ${FIELD_VALUE_SHAPE} }
`;

/**
 * Every Table field this app's reference pages select, combined from
 * Pipefy's own GraphQL reference (`public`) and its Terraform provider's
 * `tableSelection` (`description`, `authorization`, `color`, `icon`) —
 * `internal/pipefy/table.go`.
 */
export const TABLE_FIELDS = `
  id
  name
  public
  description
  authorization
  color
  icon
`;

/**
 * Every field the Table Records doc selects in a `table_record(id)` query,
 * plus the record's field values (`record_fields`) in the same rich shape
 * the fields.md "Table's Record Field" example selects — the one place
 * Pipefy's docs additionally confirm a `required` flag per field value.
 */
export const TABLE_RECORD_FIELDS = `
  id
  title
  done
  created_at
  created_by { id }
  record_fields { ${FIELD_VALUE_SHAPE} required }
`;
