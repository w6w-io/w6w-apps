/**
 * Do we have documents-per-month headroom left? — declared absent, not
 * guessed.
 *
 * PDFMonkey bills per plan against a monthly document allowance
 * ("Documents per month": 20/300/3,000/5,000/60,000 across
 * Free/Starter/Pro/Pro+/Premium, per docs/pricing-and-billing/our-plans).
 * The only field that exposes remaining headroom — `available_documents` —
 * is returned by `GET /current_user`, and that same response includes an
 * `auth_token` field. `docs/api/authentication`'s own sample response lists
 * both side by side, and nothing in the documented schema states
 * `auth_token` is a *different* secret from the API key just presented in
 * the `Authorization` header — this matches PDFMonkey's Devise-style Rails
 * stack (see `auth/bearer-token.ts`'s module doc). Since a health probe's
 * response can end up in stored/displayed health metadata, this app never
 * calls `current_user` anywhere (enforced by `tests/index.test.ts`), and
 * consequently has no way to read `available_documents` at all.
 *
 * No other endpoint or header documented anywhere in `docs/api/*` carries a
 * quota/rate-limit signal — `list-documents`, `list-templates`, and every
 * create/update/delete response were checked for headers and none is
 * present.
 *
 * `unavailable` is the honest answer per rfcs/healthcheck.md "Declaring
 * absence". `severity: "informational"` so it never pins the roll-up
 * verdict.
 */
import type { HealthCheckDefinition } from "@w6w/types";

const quota: HealthCheckDefinition = {
  key: "quota",
  title: "Documents-per-month headroom",
  description:
    "Not safely exposed: the only field (available_documents, on GET /current_user) shares a " +
    "response with a field that may echo the caller's own API key.",
  kind: "quota",
  covers: ["*"],
  severity: "informational",
  unavailable: {
    reason:
      "GET /current_user is the only endpoint documenting a remaining-document count, but its " +
      "response also carries an auth_token field indistinguishable from the caller's own API " +
      "secret key — this app does not probe it. No rate-limit headers are documented anywhere " +
      "else in the API.",
  },
};

export default quota;
