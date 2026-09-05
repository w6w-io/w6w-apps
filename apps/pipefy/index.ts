/**
 * Pipefy — no-code work management and process automation.
 *
 * Pipefy has **no REST API**. Everything is a GraphQL POST to a single
 * endpoint (`https://api.pipefy.com/graphql`), confirmed on the wire (see
 * `lib/client.ts`). Five things are worth knowing before reading any action:
 *
 *   - **Unauthenticated introspection is refused.** Unlike some GraphQL
 *     APIs in this pack (Wave), `{ __typename }` with no token answers the
 *     same generic `{"errors":[{"title":"Unauthorized", ...}]}` envelope as
 *     every other call. Every field/argument named here was verified
 *     against Pipefy's own reference docs and (for pipes/phases/tables)
 *     independently cross-checked against Pipefy's own open-source
 *     Terraform provider (`pipefy/terraform-provider-pipefy`), rather than
 *     read off a live schema — see the README for exactly which fields
 *     came from which source.
 *   - **Arguments are inlined as GraphQL literals, not `$variables`.**
 *     Because a mutation's exact input TYPE NAME can't be read off a
 *     refused-introspection schema, every named action here builds its
 *     query as a literal string (`gqlLiteral` in `lib/client.ts`) rather
 *     than declaring a typed variable that might not exist. Only the
 *     `graphql-query` escape hatch — where the caller writes and declares
 *     their own query — uses real `$variables`.
 *   - **Three distinct failure shapes, only one of them GraphQL-shaped.** A
 *     bare unauthenticated call gets a REST-flavored `errors[{title,
 *     detail}]` envelope; an invalid/expired token gets the OAuth2-flavored
 *     `{error, error_description}` envelope with no `data`/`errors` at all;
 *     only a well-formed authenticated call that fails GraphQL validation
 *     gets the `errors[{message, locations, path}]` shape most GraphQL
 *     clients expect. `PipefyClient.send` throws on all three.
 *   - **No `inputErrors[]` validation channel.** Unlike Wave, a rejected
 *     write here is either a top-level `errors[]` entry (already thrown)
 *     or a bare `success: false` field on delete-style mutations and
 *     `moveCardToPhase` — `expectSuccess` closes that second channel.
 *   - **Two very different-looking auth methods, one vendor recommendation.**
 *     Pipefy's own Authentication page states plainly that Service Accounts
 *     (OAuth2 client-credentials) are "the recommended and long-term secure
 *     method for integrations," while Personal Access Tokens "are
 *     deprecated and should no longer be used" — both are still genuinely
 *     documented and working, so both are offered here, in that order.
 *
 * Deliberately absent: labels, pipe/table members, pipe relations,
 * automations, AI Agents, reports, organization/pipe/table webhooks, and
 * phase-field/table-field DEFINITION CRUD (as opposed to a card/record's
 * field VALUES, which are covered) — see the README. All are reachable
 * through `graphql-query`.
 */
import type { AppDefinition } from "@w6w/types";
import clientCredentials from "./auth/client-credentials.ts";
import personalAccessToken from "./auth/personal-access-token.ts";

// Reference
import meGet from "./actions/me-get.ts";
import organizationList from "./actions/organization-list.ts";
import organizationGet from "./actions/organization-get.ts";

// Pipes
import pipeList from "./actions/pipe-list.ts";
import pipeGet from "./actions/pipe-get.ts";
import pipeCreate from "./actions/pipe-create.ts";
import pipeUpdate from "./actions/pipe-update.ts";
import pipeDelete from "./actions/pipe-delete.ts";

// Phases
import phaseList from "./actions/phase-list.ts";
import phaseGet from "./actions/phase-get.ts";
import phaseCreate from "./actions/phase-create.ts";
import phaseUpdate from "./actions/phase-update.ts";
import phaseDelete from "./actions/phase-delete.ts";

// Cards
import cardList from "./actions/card-list.ts";
import cardFind from "./actions/card-find.ts";
import cardGet from "./actions/card-get.ts";
import cardCreate from "./actions/card-create.ts";
import cardUpdate from "./actions/card-update.ts";
import cardUpdateField from "./actions/card-update-field.ts";
import cardMove from "./actions/card-move.ts";
import cardDelete from "./actions/card-delete.ts";

// Database Tables
import tableList from "./actions/table-list.ts";
import tableGet from "./actions/table-get.ts";
import tableRecordList from "./actions/table-record-list.ts";
import tableRecordGet from "./actions/table-record-get.ts";
import tableRecordCreate from "./actions/table-record-create.ts";
import tableRecordUpdate from "./actions/table-record-update.ts";
import tableRecordDelete from "./actions/table-record-delete.ts";

// Escape hatch
import graphqlQuery from "./actions/graphql-query.ts";

import service from "./health/service.ts";

export default {
  actions: [
    // reference
    meGet,
    organizationList,
    organizationGet,
    // pipe
    pipeList,
    pipeGet,
    pipeCreate,
    pipeUpdate,
    pipeDelete,
    // phase
    phaseList,
    phaseGet,
    phaseCreate,
    phaseUpdate,
    phaseDelete,
    // card
    cardList,
    cardFind,
    cardGet,
    cardCreate,
    cardUpdate,
    cardUpdateField,
    cardMove,
    cardDelete,
    // table
    tableList,
    tableGet,
    tableRecordList,
    tableRecordGet,
    tableRecordCreate,
    tableRecordUpdate,
    tableRecordDelete,
    // raw
    graphqlQuery,
  ],
  auth: [clientCredentials, personalAccessToken],
  healthChecks: [service],
} satisfies AppDefinition;
