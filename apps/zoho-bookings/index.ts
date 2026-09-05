/**
 * Zoho Bookings — appointment scheduling, over the Zoho Bookings v1 API
 * (`https://www.zohoapis.com/bookings/v1/json/...`, and its seven regional
 * siblings).
 *
 * Every path, verb, parameter and response shape in this app was verified
 * 2026-09-05 against Zoho's own documentation — fetched via the Wayback
 * Machine, since `www.zoho.com` answers a bare `403` to this container's
 * direct requests (`https://www.zoho.com/bookings/help/api/v1/*.html`:
 * generate-accesstoken, oauthauthentication, domain-specificapiurls,
 * fetch-workspaces, fetch-services, fetch-staff, fetch-availability,
 * book-appointment, get-appointment, update-appointment,
 * reschedule-appointment, add-staff) — and against live probes of the real
 * `www.zohoapis.<tld>` / `accounts.zoho*` hosts run directly from this
 * container. Nothing here came from a third-party integration directory.
 *
 * Scoped to **Zoho Bookings specifically** — this pack already ships `zoho`
 * (Zoho CRM), `zohobooks` and `zohodesk`, separate products with separate API
 * surfaces; do not confuse the four. This app covers every endpoint Zoho
 * documents for Bookings' v1 API — there is no customer list, recurring
 * appointment, payment or resource-management endpoint published, so none of
 * those are attempted.
 *
 * The findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **The API is JSON-RPC-shaped, not resource-per-path REST** (`lib/client.ts`).
 *     Every endpoint hangs a verb (`services`, `getappointment`,
 *     `updateappointment`, ...) off one fixed `/bookings/v1/json/` prefix,
 *     unlike `zohobooks`'s `/books/v3/{resource}` or `zohodesk`'s
 *     `/api/v1/{resource}` shape.
 *  2. **Write endpoints take `multipart/form-data`, not JSON** (`actions/*.ts`).
 *     Book/Update/Reschedule Appointment and Add Staff are all documented
 *     with a `curl --form` sample — several fields are themselves
 *     JSON-encoded strings inside the form, and Add Staff's entire payload
 *     travels under one field, `staffMap`.
 *  3. **A single OAuth scope covers the whole API** (`auth/oauth2.ts`).
 *     `zohobookings.data.CREATE` is the only scope Zoho documents for this
 *     product — unlike `zohobooks`/`zoho` CRM's per-resource scope families,
 *     there is no narrower grant to request.
 *  4. **An auth failure answers a generic HTML gateway page, not the
 *     documented JSON envelope** (`lib/client.ts`, `auth/oauth2.ts`). Both a
 *     missing and an invalid access token answer a "Zoho Creator" branded
 *     error page (`content-type: text/html`) rather than a structured body —
 *     verified live 2026-09-05. `oauth2.ts`'s `test` hook necessarily falls
 *     back to the HTTP status itself (400 vs 401) here, the one place in
 *     this app that cannot classify from a response body because the vendor
 *     exposes none.
 *  5. **Add Staff's response has no `returnvalue`/`status` wrapper at all**
 *     (`lib/client.ts`, `actions/staff-add.ts`) — a bare `{"response": [...]}`
 *     array whose per-item `status` field can be `"success"` OR an error
 *     description (`"Staff already exists"`) on an otherwise-2xx response.
 *  6. **Multi-data-centre, and Canada's accounts host does not follow the API
 *     host's naming pattern** (`lib/regions.ts`) — the same Canada finding
 *     this pack's `zohobooks`/`zohodesk` apps already document for their own
 *     products; Zoho's accounts/OAuth infrastructure is shared platform-wide.
 *  7. **No quota surface exists** (`health/quota.ts`). Zoho Bookings
 *     documents real per-user/per-day limits by plan, but exposes no
 *     `X-RateLimit-*` (or equivalent) response header — declared absent
 *     rather than guessed.
 *
 * Deliberately absent: everything not covered by Zoho's own published v1 API
 * — a customer/contact list, recurring appointments, payments/checkout,
 * resource (room/equipment) management, and staff group management. If a
 * workflow needs one of them and Zoho documents it, `lib/client.ts`'s
 * `ZohoBookingsClient` covers most additions with a thin new action file,
 * the same way the nine here were built.
 */
import type { AppDefinition } from "@w6w/types";
import oauth2 from "./auth/oauth2.ts";

import workspaceList from "./actions/workspace-list.ts";
import serviceList from "./actions/service-list.ts";
import staffList from "./actions/staff-list.ts";
import staffAdd from "./actions/staff-add.ts";
import availabilityList from "./actions/availability-list.ts";
import appointmentBook from "./actions/appointment-book.ts";
import appointmentGet from "./actions/appointment-get.ts";
import appointmentUpdate from "./actions/appointment-update.ts";
import appointmentReschedule from "./actions/appointment-reschedule.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // workspaces
    workspaceList,
    // services
    serviceList,
    // staff
    staffList,
    staffAdd,
    // availability
    availabilityList,
    // appointments
    appointmentBook,
    appointmentGet,
    appointmentUpdate,
    appointmentReschedule,
  ],
  // OAuth2 only, one method per Zoho data centre — see auth/oauth2.ts and
  // lib/regions.ts.
  auth: oauth2,
  healthChecks: [service, quota],
} satisfies AppDefinition;
