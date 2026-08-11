/**
 * GetResponse — contacts, campaigns (lists), tags, custom fields and broadcast
 * newsletters on the **GetResponse API v3**.
 *
 * Every path, parameter and field was verified on 2026-08-11 against
 * GetResponse's own OpenAPI document
 * (`apireference.getresponse.com/open-api.json`, OpenAPI 3.0.0, version stamp
 * `3.2026-07-28`, 141 paths) plus its narrative documentation and live probes
 * against `api.getresponse.com`. Nothing here came from a third-party
 * integration directory.
 *
 * The four findings that shaped the design, each documented in full where it
 * matters:
 *
 *  1. **Three hosts, not one** (`lib/client.ts`). Retail, MAX US and MAX PL are
 *     separate platforms and a key works on exactly one, so the platform is an
 *     Auth field and all three hosts are allowlisted — by name, since the set is
 *     closed and known at publish time.
 *  2. **The header value carries a literal prefix** (`auth/api-key.ts`):
 *     `X-Auth-Token: api-key <key>`. Omitting `api-key ` produces code 1014,
 *     "Unsupported authentication method", which reads like a bad key.
 *  3. **Creating a contact answers 202, not 201**
 *     (`actions/contact-create.ts`). The add is *queued*: there is no contact id
 *     in the reply and a read-back immediately afterwards may not find it.
 *  4. **Update is a POST** (`actions/contact-update.ts`), as is create — the
 *     method tells you nothing about which you are doing; the id in the path
 *     does.
 *
 * Filters and sorts are bracketed query parameters (`query[createdOn][from]`,
 * `sort[email]`), which `buildQuery` produces from ordinary fields so an action
 * never has to spell them.
 */
import type { AppDefinition } from "@w6w/types";
import apiKey from "./auth/api-key.ts";

import contactList from "./actions/contact-list.ts";
import contactGet from "./actions/contact-get.ts";
import contactCreate from "./actions/contact-create.ts";
import contactUpdate from "./actions/contact-update.ts";
import contactDelete from "./actions/contact-delete.ts";
import contactTagsAdd from "./actions/contact-tags-add.ts";

import campaignList from "./actions/campaign-list.ts";
import campaignContacts from "./actions/campaign-contacts.ts";

import tagList from "./actions/tag-list.ts";
import tagCreate from "./actions/tag-create.ts";
import customFieldList from "./actions/custom-field-list.ts";
import fromFieldList from "./actions/from-field-list.ts";

import newsletterList from "./actions/newsletter-list.ts";
import newsletterCreate from "./actions/newsletter-create.ts";

import service from "./health/service.ts";
import quota from "./health/quota.ts";

export default {
  actions: [
    // contacts
    contactList,
    contactGet,
    contactCreate,
    contactUpdate,
    contactDelete,
    contactTagsAdd,
    // campaigns — GetResponse's word for lists, and where campaignId comes from
    campaignList,
    campaignContacts,
    // the lookup surfaces the write actions depend on
    tagList,
    tagCreate,
    customFieldList,
    fromFieldList,
    // newsletters
    newsletterList,
    newsletterCreate,
  ],
  // API key only. The spec also declares OAuth2, but its only scope is `all`, so
  // it buys no least-privilege benefit over a revocable key — and `sign` is
  // network-less, so a refreshable token would have to be resolved elsewhere.
  auth: [apiKey],
  healthChecks: [service, quota],
} satisfies AppDefinition;
