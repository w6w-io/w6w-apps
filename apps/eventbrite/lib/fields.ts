import type { HookContext, Option, Param, ResolveFieldsHook } from "@w6w/types";
import { EventbriteClient, type EventbriteListResponse } from "./client.ts";

const MAX_OPTIONS = 1000;

interface Named {
  id: string;
  name?: string;
}

/** An event row: Eventbrite gives an event's name as `{ text, html }`, not a string. */
interface EventRow {
  id: string;
  name?: { text?: string | null } | null;
  start?: { local?: string | null } | null;
  status?: string;
}

/**
 * Event statuses the picker lists: everything a workflow could still be watching or reading.
 * Completed and canceled events are left out; an id can still be typed or mapped.
 */
const PICKER_EVENT_STATUS = "draft,live,started,ended";

/** Page a list endpoint using its supported pagination style, up to the cap. */
async function listAll<K extends string, T = Named>(
  ctx: HookContext,
  path: string,
  key: K,
  pagination: "continuation" | "page" = "continuation",
  base: Record<string, string> = {},
): Promise<T[]> {
  const client = new EventbriteClient(ctx);
  const items: T[] = [];
  const seenPages = new Set<string>();
  let query: Record<string, string | number> = { ...base };
  while (items.length < MAX_OPTIONS) {
    const pageKey = JSON.stringify(query);
    if (seenPages.has(pageKey) || seenPages.size >= MAX_OPTIONS) {
      throw new Error("Eventbrite pagination did not advance while loading field options.");
    }
    seenPages.add(pageKey);
    const res = await client.request<EventbriteListResponse<K, T>>(path, { query });
    items.push(...(res[key] ?? []));
    const p = res.pagination;
    if (!p?.has_more_items) break;
    // Organizers returns a continuation token too, but ignores that query parameter:
    // following it repeats page 1. That endpoint must advance with `page`.
    query = pagination === "continuation" && p.continuation
      ? { ...base, continuation: p.continuation }
      : { ...base, page: (p.page_number ?? Number(query.page ?? 1)) + 1 };
  }
  return items.slice(0, MAX_OPTIONS);
}

const listOrgs = (ctx: HookContext) => listAll(ctx, "/users/me/organizations/", "organizations");
const listOrganizers = (ctx: HookContext, orgId: string) =>
  listAll(ctx, `/organizations/${encodeURIComponent(orgId)}/organizers/`, "organizers", "page");

const listEvents = (ctx: HookContext, orgId: string) =>
  listAll<"events", EventRow>(
    ctx,
    `/organizations/${encodeURIComponent(orgId)}/events/`,
    "events",
    "continuation",
    { status: PICKER_EVENT_STATUS, order_by: "start_desc" },
  );

/** "Name · 2026-12-01" — the start date tells apart a series' same-named dates. */
function eventOption(e: EventRow, orgName?: string): Option {
  const name = e.name?.text?.trim() || e.id;
  const day = e.start?.local?.slice(0, 10);
  const label = day ? `${name} · ${day}` : name;
  const parts = [orgName, e.status].filter((x): x is string => !!x);
  return parts.length > 0 ? { value: e.id, label, description: parts.join(" · ") } : {
    value: e.id,
    label,
  };
}

/**
 * Shared `resolveFields` hook for the Eventbrite actions and triggers that take an organization,
 * organizer or event: one picker per id, each still accepting a typed or mapped value.
 */
/**
 * Per-field budget, under the host's 10 s cap on the whole hook: a slow list returns its own field
 * error instead of timing out the call and losing every other field (the organization picker
 * stayed on "Loading…" while the events of every organization were still being walked).
 */
const FIELD_BUDGET_MS = 7_000;

class FieldTimeout extends Error {}

async function withinBudget<T>(work: Promise<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new FieldTimeout()), FIELD_BUDGET_MS);
  });
  try {
    return await Promise.race([work, timeout]);
  } finally {
    clearTimeout(timer);
  }
}

const CHOOSE_ORG = "Choose an organization to list its records.";

/**
 * Shared `resolveFields` hook for the Eventbrite actions and triggers that take an organization,
 * organizer or event: one picker per id, each still accepting a typed or mapped value. Each field
 * resolves on its own, so the organization list shows even when another list fails or is slow.
 */
export const resolveEventbriteFields: ResolveFieldsHook = async (input, ctx) => {
  const fields: Record<string, { options?: Option[]; error?: string }> = {};

  // One `/users/me/organizations/` fetch serves `organizationId`, an organization `scopeId`, and
  // the "which organization" fallback of the event and organizer lists.
  let orgs: Promise<Named[]> | undefined;
  const orgsOnce = () => (orgs ??= listOrgs(ctx));
  const orgOptions = async () =>
    (await orgsOnce()).map((o) => ({ value: o.id, label: o.name ?? o.id }));

  // The form offers an organization picker (a trigger, an org-scoped action): a list of events or
  // organizers waits for that choice rather than walking every organization the account has.
  const hasOrgField = input.fields.includes("organizationId") ||
    Object.hasOwn(input.form, "organizationId");
  const chosenOrg = typeof input.form.organizationId === "string" &&
      input.form.organizationId !== ""
    ? input.form.organizationId
    : undefined;

  /**
   * Organizations whose records a list covers: the chosen one; with none chosen, the account's
   * only organization, or (no organization picker on the form) every organization. `null` means
   * the user has to pick an organization first.
   */
  const scopeOrgs = async (): Promise<Named[] | null> => {
    if (chosenOrg) return [{ id: chosenOrg }];
    const all = await orgsOnce();
    if (all.length <= 1 || !hasOrgField) return all;
    return null;
  };

  const eventOptions = async (): Promise<Option[] | null> => {
    const scope = await scopeOrgs();
    if (scope === null) return null;
    const label = scope.length > 1;
    const lists = await Promise.all(scope.map((o) => listEvents(ctx, o.id)));
    return lists
      .flatMap((events, i) =>
        events.map((e) => eventOption(e, label ? scope[i].name ?? scope[i].id : undefined))
      )
      .slice(0, MAX_OPTIONS);
  };

  const organizerOptions = async (): Promise<Option[] | null> => {
    const scope = await scopeOrgs();
    if (scope === null) return null;
    const label = scope.length > 1;
    const lists = await Promise.all(scope.map((o) => listOrganizers(ctx, o.id)));
    return lists
      .flatMap((organizers, i) =>
        organizers.map((o) => ({
          value: o.id,
          label: o.name ?? o.id,
          ...(label ? { description: scope[i].name ?? scope[i].id } : {}),
        }))
      )
      .slice(0, MAX_OPTIONS);
  };

  const resolve = async (key: string, work: () => Promise<Option[] | null>) => {
    try {
      const options = await withinBudget(work());
      fields[key] = options === null ? { options: [], error: CHOOSE_ORG } : { options };
    } catch (err) {
      fields[key] = {
        error: err instanceof FieldTimeout
          ? "Eventbrite took too long to list these. Type or map an id instead."
          : err instanceof Error
          ? err.message
          : String(err),
      };
    }
  };

  const jobs: Promise<void>[] = [];
  if (input.fields.includes("organizationId")) {
    jobs.push(resolve("organizationId", orgOptions));
  }
  if (input.fields.includes("scopeId") && !input.unresolved.includes("scope")) {
    jobs.push(
      resolve(
        "scopeId",
        async () =>
          input.form.scope === "organization"
            ? await orgOptions()
            : input.form.scope === "event"
            ? await eventOptions()
            : [],
      ),
    );
  }
  if (input.fields.includes("eventId") && !input.unresolved.includes("organizationId")) {
    jobs.push(resolve("eventId", eventOptions));
  }
  if (input.fields.includes("organizerId") && !input.unresolved.includes("organizationId")) {
    jobs.push(resolve("organizerId", organizerOptions));
  }
  await Promise.all(jobs);

  return { fields };
};

/** The id params `resolveEventbriteFields` serves options for. */
const PICKED_KEYS = new Set(["organizationId", "eventId", "scopeId"]);

/**
 * A trigger's params with every organization, event and scope id turned into a picker served by
 * `resolveEventbriteFields`, the same as on the actions. Each still accepts a typed or mapped id
 * (`allowCustom`), and an event picker refreshes when its organization changes. A param that
 * already declares options is left as it is.
 */
export function withPickers(params: Param[]): Param[] {
  const keys = new Set(params.map((p) => p.key));
  return params.map((p) => {
    if (!PICKED_KEYS.has(p.key) || p.type !== "string" || p.options) return p;
    const refreshOn = [
      ...(p.key === "scopeId" && keys.has("scope") ? ["scope"] : []),
      ...(p.key !== "organizationId" && keys.has("organizationId") ? ["organizationId"] : []),
    ];
    return {
      ...p,
      options: { source: "resolveFields", ...(refreshOn.length > 0 ? { refreshOn } : {}) },
      config: { ...p.config, allowCustom: true },
    };
  });
}
