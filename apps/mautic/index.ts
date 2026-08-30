/**
 * Mautic — contacts, segments, companies, campaigns and email sends, on
 * whichever instance you run.
 *
 * Every path, parameter and response shape here was taken from Mautic's own
 * developer documentation (`devdocs.mautic.org/en/7.1/rest_api/`, read
 * 2026-08-30) — `getting_started.html`, `authentication.html`,
 * `contacts.html`, `segments.html`, `companies.html`, `campaigns.html`,
 * `emails.html`, `tags.html`, `users.html`.
 *
 * ## There is no vendor host
 *
 * Mautic is self-hosted open-source marketing automation — some
 * organisations buy a hosted edition from a partner, but there is no single
 * fixed `api.mautic.*` host the way there is for a SaaS vendor. So the base
 * URL is a connection field and the egress allowlist is `["*"]`, the posture
 * this pack already uses for `gitea`, `mattermost`, `ghost`, `grafana` and
 * `jenkins`. It is deliberately wide, and it is the price of an app whose
 * server address only the operator knows.
 *
 * ## Auth: Client Credentials, not Basic
 *
 * Mautic documents two ways in: OAuth2 (three grants — Authorization Code,
 * refresh, and Client Credentials) and Basic Authentication (a real Mautic
 * user's password, off by default). This app implements only the Client
 * Credentials grant: Mautic's own docs say it "suits Machine-to-Machine (M2M)
 * communications such as Cron jobs", which is exactly what an unattended
 * workflow is, where Authorization Code needs a browser login. Basic Auth is
 * declined for the reason it usually is in this pack — it is a real
 * password, not an independently revocable, auditable credential. See
 * `auth/client-credentials.ts` for the full reasoning, including why there is
 * no `refresh` token for this grant to fall back on.
 *
 * ## The REST API is off by default
 *
 * An operator has to turn it on under Configuration → API Settings before any
 * of this reaches anything — a 404 on every action from a freshly-installed
 * instance is that setting, not a wrong URL.
 *
 * ## Four things that go wrong quietly
 *
 *   - **The segment list envelope key is `lists`, not `segments`.** Mautic
 *     still calls the underlying entity a "list" internally even though every
 *     surface (including its own docs page title) calls it a Segment. Read
 *     `body.segments` and you get `undefined`.
 *   - **Company field aliases are all prefixed `company*`.** A Contact takes
 *     bare `firstname`/`email`; a Company takes `companyname`/`companyemail`.
 *     Mixing the two conventions up is a silent no-op, not an error — Mautic
 *     accepts an unknown field alias and just ignores it.
 *   - **`PATCH` vs `PUT` on every `.../edit` route change more than the
 *     status code.** `PUT` creates the record if the ID is missing *and*
 *     clears every field the request omits; `PATCH` fails on a missing ID and
 *     only touches the fields sent. `contact-edit` uses `PATCH` deliberately,
 *     so an edit action never surprises a caller by blanking untouched fields
 *     or silently creating a new contact.
 *   - **There is no unauthenticated version or health endpoint.** Unlike
 *     Gitea's `/version`, nothing in Mautic's REST API docs answers without a
 *     Connection — `health/instance.ts` reads Mautic's own documented error
 *     envelope from an unsigned request instead, and says so.
 *
 * ## Where the destructive verb lives
 *
 * `contact-delete` is the one destructive action here, gated behind an
 * explicit confirmation the same way `gitea`'s `repo-delete` and
 * `file-delete` are — a self-hosted instance has no trash, so a deleted
 * contact's points, segment history and Do Not Contact record are gone with
 * it.
 *
 * Deliberately out of scope: the campaign builder itself (creating or editing
 * a campaign's event graph), forms, landing pages, dynamic content, focus
 * items, themes, assets, reports, stats, plugin/integration configuration,
 * webhooks and Mautic's own user management. Each is its own surface, and
 * none of it is the daily loop of managing contacts and sending mail a
 * workflow actually touches.
 */
import type { AppDefinition } from "@w6w/types";
import clientCredentials from "./auth/client-credentials.ts";

import contactGet from "./actions/contact-get.ts";
import contactList from "./actions/contact-list.ts";
import contactCreate from "./actions/contact-create.ts";
import contactEdit from "./actions/contact-edit.ts";
import contactDelete from "./actions/contact-delete.ts";
import contactPointsAdd from "./actions/contact-points-add.ts";
import contactPointsSubtract from "./actions/contact-points-subtract.ts";
import contactDncAdd from "./actions/contact-dnc-add.ts";
import contactDncRemove from "./actions/contact-dnc-remove.ts";
import segmentList from "./actions/segment-list.ts";
import segmentGet from "./actions/segment-get.ts";
import segmentCreate from "./actions/segment-create.ts";
import segmentContactAdd from "./actions/segment-contact-add.ts";
import segmentContactRemove from "./actions/segment-contact-remove.ts";
import companyList from "./actions/company-list.ts";
import companyGet from "./actions/company-get.ts";
import companyCreate from "./actions/company-create.ts";
import companyContactAdd from "./actions/company-contact-add.ts";
import companyContactRemove from "./actions/company-contact-remove.ts";
import campaignList from "./actions/campaign-list.ts";
import campaignGet from "./actions/campaign-get.ts";
import campaignContactAdd from "./actions/campaign-contact-add.ts";
import campaignContactRemove from "./actions/campaign-contact-remove.ts";
import emailList from "./actions/email-list.ts";
import emailSendToContact from "./actions/email-send-to-contact.ts";
import emailSendToSegment from "./actions/email-send-to-segment.ts";
import tagList from "./actions/tag-list.ts";
import userGetSelf from "./actions/user-get-self.ts";

import instance from "./health/instance.ts";
import service from "./health/service.ts";

export default {
  actions: [
    // contacts
    contactGet,
    contactList,
    contactCreate,
    contactEdit,
    contactDelete,
    contactPointsAdd,
    contactPointsSubtract,
    contactDncAdd,
    contactDncRemove,
    // segments
    segmentList,
    segmentGet,
    segmentCreate,
    segmentContactAdd,
    segmentContactRemove,
    // companies
    companyList,
    companyGet,
    companyCreate,
    companyContactAdd,
    companyContactRemove,
    // campaigns
    campaignList,
    campaignGet,
    campaignContactAdd,
    campaignContactRemove,
    // emails
    emailList,
    emailSendToContact,
    emailSendToSegment,
    // tags
    tagList,
    // who this is
    userGetSelf,
  ],
  auth: [clientCredentials],
  healthChecks: [instance, service],
} satisfies AppDefinition;
