/**
 * Formidable Forms — forms, fields, entries, statistics, styles and Views, on
 * whichever WordPress install you run it on.
 *
 * Every route, parameter and auth detail here was taken from Formidable's own
 * developer documentation, fetched 2026-09-05:
 * `formidableforms.com/knowledgebase/formidable-api-rest-endpoints/` (the
 * `/frm/v3` reference), `.../using-application-passwords-for-api-authentication/`,
 * and `.../formidable-api/` (the legacy `/frm/v2` "Send API Data" article, read
 * only to confirm what `/frm/v2` is and is not).
 *
 * ## There is no vendor host
 *
 * Formidable Forms is a **WordPress plugin**, not a SaaS. It registers its
 * REST namespace on the customer's own WordPress REST API, so the base URL is
 * a connection field and the egress allowlist is `["*"]` — the posture this
 * pack already uses for `gravityforms`, `gitea`, `ghost` and `mautic`. See
 * `lib/client.ts` for the full reasoning.
 *
 * ## `/frm/v2` is frozen — this app targets `/frm/v3`
 *
 * A prior candidate app for this pack was scoped against `/frm/v2`
 * (`.../forms/`, `.../forms/{id}/entries`, etc.) before this build re-verified
 * the vendor's current reference. That reference is unambiguous: *"Formidable
 * API Add-On 2.0 uses `/frm/v3` as the current REST namespace... The add-on
 * keeps `/frm/v2` as a frozen legacy namespace for existing integrations. Use
 * `/frm/v3` for new integrations."* `/frm/v2` also lacks whole resource
 * families v3 has — no styles, form actions, form style assignment,
 * Applications, Application items, or View layouts — and, per the same page,
 * will never receive them. Every route this app calls is a `/frm/v3` route.
 *
 * ## Auth: a WordPress Application Password, not the legacy Formidable API key
 *
 * `/frm/v3` authenticates with HTTP Basic using a WordPress username and an
 * Application Password. The older `frm_api_key` (Formidable -> Global
 * Settings -> API) is a **different, unscoped credential**: the vendor's own
 * docs say it "runs a request with administrator access," and it is
 * documented only for the legacy `/frm/v2` webhook flow, never for `/frm/v3`.
 * See `auth/basic.ts`.
 *
 * ## Two prerequisites that 404 look like a wrong URL
 *
 *   - Formidable Forms Pro + the "Formidable API" add-on (2.0+) must both be
 *     installed and active, on a plan that includes the API add-on.
 *   - `REST API` must be switched on at Formidable -> Global Settings -> API —
 *     "When REST API is off, Formidable does not register the `/frm/v2` or
 *     `/frm/v3` routes." Every action then 404s.
 *
 * `health/site.ts` distinguishes both of these from a genuinely offline site.
 *
 * ## Response shapes are not documented with worked examples
 *
 * Unlike the legacy `/frm/v2` webhook article — which shows concrete JSON
 * request/response bodies for entries — the `/frm/v3` endpoint reference gives
 * only route tables and a handful of request-only curl examples (create a
 * style, create a View, assign a style, create a View layout). No response
 * body is shown for any route. Every action here therefore returns the
 * response verbatim rather than declaring a guessed `output` shape — the same
 * choice this pack's `mautic` app makes for routes its own vendor doesn't
 * spell out.
 *
 * ## Deliberately out of scope
 *
 * Building a form's field graph (create/update/delete a Field), form actions
 * (notifications and webhooks), style CSS internals, Applications, Application
 * items, and View layouts are all real `/frm/v3` routes this app does not
 * implement — each has a write shape the reference names only in the vaguest
 * terms ("form settings", "type-specific" action content, "the internal
 * `post_content` property names" a caller is told not to guess at), and
 * getting one wrong writes malformed data into a form or style with no
 * documented recovery path. `field-get-many` covers the read side. Where a
 * write shape IS concrete (Forms, Entries, a style's `name`, a View's
 * `form`/`name`/`type`/`status`, assigning a style to a form), it is
 * implemented.
 */
import type { AppDefinition } from "@w6w/types";
import basic from "./auth/basic.ts";

import formGetMany from "./actions/form-get-many.ts";
import formGet from "./actions/form-get.ts";
import formCreate from "./actions/form-create.ts";
import formUpdate from "./actions/form-update.ts";
import formDelete from "./actions/form-delete.ts";
import fieldGetMany from "./actions/field-get-many.ts";
import entryGetMany from "./actions/entry-get-many.ts";
import entryGet from "./actions/entry-get.ts";
import entryCreate from "./actions/entry-create.ts";
import entryUpdate from "./actions/entry-update.ts";
import entryDelete from "./actions/entry-delete.ts";
import statsGet from "./actions/stats-get.ts";
import styleGetMany from "./actions/style-get-many.ts";
import formStyleAssign from "./actions/form-style-assign.ts";
import viewGetMany from "./actions/view-get-many.ts";

import service from "./health/service.ts";
import site from "./health/site.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // forms
    formGetMany,
    formGet,
    formCreate,
    formUpdate,
    formDelete,
    // fields
    fieldGetMany,
    // entries
    entryGetMany,
    entryGet,
    entryCreate,
    entryUpdate,
    entryDelete,
    // statistics
    statsGet,
    // styles
    styleGetMany,
    formStyleAssign,
    // views
    viewGetMany,
  ],
  auth: [basic],
  healthChecks: [service, site, quota],
} satisfies AppDefinition;
