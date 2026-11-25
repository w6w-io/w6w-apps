import { test } from "node:test";
import { assertEquals } from "../_assert.ts";
import { mockCtx } from "../_helpers.ts";
import { resolveEventbriteFields } from "../../lib/fields.ts";

const B = "https://www.eventbriteapi.com/v3";
const input = (
  fields: string[],
  form: Record<string, unknown> = {},
  unresolved: string[] = [],
) => ({ fields, form, unresolved, reason: "init" as const });
const items = (prefix: string, n: number) =>
  Array.from({ length: n }, (_, i) => ({ id: `${prefix}${i}`, name: `N${prefix}${i}` }));

test("organizationId: option shape and URL", async () => {
  const { ctx, calls } = mockCtx([{
    body: { organizations: [{ id: "1", name: "Acme" }], pagination: { has_more_items: false } },
  }]);
  const out = await resolveEventbriteFields(input(["organizationId"]), ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, `${B}/users/me/organizations/`);
  assertEquals(out.fields.organizationId?.options, [{ value: "1", label: "Acme" }]);
  assertEquals(Object.keys(out.fields), ["organizationId"]);
});

test("organizationId: page-number pagination", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        organizations: [{ id: "1", name: "A" }],
        pagination: { has_more_items: true, page_number: 1 },
      },
    },
    {
      body: {
        organizations: [{ id: "2", name: "B" }],
        pagination: { has_more_items: false, page_number: 2 },
      },
    },
  ]);
  const out = await resolveEventbriteFields(input(["organizationId"]), ctx);
  assertEquals(calls[1].url, `${B}/users/me/organizations/?page=2`);
  assertEquals(out.fields.organizationId?.options?.map((o) => o.value), ["1", "2"]);
});

test("organizationId: continuation pagination", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        organizations: [{ id: "1", name: "A" }],
        pagination: { has_more_items: true, continuation: "tok" },
      },
    },
    { body: { organizations: [{ id: "2", name: "B" }], pagination: { has_more_items: false } } },
  ]);
  const out = await resolveEventbriteFields(input(["organizationId"]), ctx);
  assertEquals(calls[1].url, `${B}/users/me/organizations/?continuation=tok`);
  assertEquals(out.fields.organizationId?.options?.length, 2);
});

test("organizationId: 1000 cap, no third request", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        organizations: items("a", 600),
        pagination: { has_more_items: true, page_number: 1 },
      },
    },
    {
      body: {
        organizations: items("b", 600),
        pagination: { has_more_items: true, page_number: 2 },
      },
    },
  ]);
  const out = await resolveEventbriteFields(input(["organizationId"]), ctx);
  assertEquals(calls.length, 2);
  assertEquals(out.fields.organizationId?.options?.length, 1000);
});

test("organizerId: org-scoped, id encoded, no org request", async () => {
  const { ctx, calls } = mockCtx([{
    body: { organizers: [{ id: "9", name: "Org9" }], pagination: { has_more_items: false } },
  }]);
  const out = await resolveEventbriteFields(input(["organizerId"], { organizationId: "a/b" }), ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, `${B}/organizations/a%2Fb/organizers/`);
  assertEquals(out.fields.organizerId?.options, [{ value: "9", label: "Org9" }]);
});

test("organizerId: uses page numbers even when the response also has continuation tokens", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        organizers: [{ id: "1", name: "A" }],
        pagination: { has_more_items: true, page_number: 1, continuation: "ignored" },
      },
    },
    {
      body: {
        organizers: [{ id: "2", name: "B" }],
        pagination: { has_more_items: true, page_number: 2, continuation: "ignored" },
      },
    },
    { body: { organizers: [{ id: "3", name: "C" }], pagination: { has_more_items: false } } },
  ]);
  const out = await resolveEventbriteFields(input(["organizerId"], { organizationId: "5" }), ctx);
  assertEquals(calls[1].url, `${B}/organizations/5/organizers/?page=2`);
  assertEquals(calls[2].url, `${B}/organizations/5/organizers/?page=3`);
  assertEquals(out.fields.organizerId?.options?.length, 3);
});

test("organizerId: org-scoped 1000 cap", async () => {
  const { ctx, calls } = mockCtx([
    { body: { organizers: items("a", 600), pagination: { has_more_items: true, page_number: 1 } } },
    { body: { organizers: items("b", 600), pagination: { has_more_items: true, page_number: 2 } } },
  ]);
  const out = await resolveEventbriteFields(input(["organizerId"], { organizationId: "5" }), ctx);
  assertEquals(calls.length, 2);
  assertEquals(out.fields.organizerId?.options?.length, 1000);
});

test("organizerId: no organization picker on the form -> all orgs with description", async () => {
  const noMore = { has_more_items: false };
  const { ctx, calls } = mockCtx([
    {
      body: {
        organizations: [{ id: "1", name: "One" }, { id: "2", name: "Two" }],
        pagination: noMore,
      },
    },
    { body: { organizers: [{ id: "a", name: "A" }], pagination: noMore } },
    { body: { organizers: [{ id: "b", name: "B" }], pagination: noMore } },
  ]);
  const out = await resolveEventbriteFields(input(["organizerId"], {}), ctx);
  assertEquals(calls.map((c) => c.url), [
    `${B}/users/me/organizations/`,
    `${B}/organizations/1/organizers/`,
    `${B}/organizations/2/organizers/`,
  ]);
  assertEquals(out.fields.organizerId?.options, [
    { value: "a", label: "A", description: "One" },
    { value: "b", label: "B", description: "Two" },
  ]);
});

test("organization picker blank, several orgs: lists wait for the choice; orgs still listed", async () => {
  const noMore = { has_more_items: false };
  const { ctx, calls } = mockCtx([
    {
      body: {
        organizations: [{ id: "1", name: "One" }, { id: "2", name: "Two" }],
        pagination: noMore,
      },
    },
  ]);
  const out = await resolveEventbriteFields(
    input(["organizationId", "eventId", "organizerId"], { organizationId: "" }),
    ctx,
  );
  // One organizations fetch; no walk of every organization's events or organizers.
  assertEquals(calls.map((c) => c.url), [`${B}/users/me/organizations/`]);
  assertEquals(out.fields.organizationId?.options, [
    { value: "1", label: "One" },
    { value: "2", label: "Two" },
  ]);
  assertEquals(out.fields.eventId?.options, []);
  assertEquals(typeof out.fields.eventId?.error, "string");
  assertEquals(out.fields.organizerId?.options, []);
});

test("organization picker blank, one org: its events, unlabelled", async () => {
  const noMore = { has_more_items: false };
  const { ctx, calls } = mockCtx([
    { body: { organizations: [{ id: "1", name: "One" }], pagination: noMore } },
    { body: { events: [{ id: "e1", name: { text: "Gala" } }], pagination: noMore } },
  ]);
  const out = await resolveEventbriteFields(
    input(["organizationId", "eventId"], { organizationId: "" }),
    ctx,
  );
  assertEquals(calls.length, 2);
  assertEquals(out.fields.organizationId?.options, [{ value: "1", label: "One" }]);
  assertEquals(out.fields.eventId?.options, [{ value: "e1", label: "Gala" }]);
});

test("organizerId: unresolved organizationId -> nothing", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await resolveEventbriteFields(
    input(["organizerId"], { organizationId: "5" }, ["organizationId"]),
    ctx,
  );
  assertEquals(calls.length, 0);
  assertEquals(out.fields, {});
});

test("unrequested keys: zero calls, empty fields", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await resolveEventbriteFields(input(["other"]), ctx);
  assertEquals(calls.length, 0);
  assertEquals(out.fields, {});
});

test("both requested, org-scoped: orgs then scoped organizers", async () => {
  const noMore = { has_more_items: false };
  const { ctx, calls } = mockCtx([
    { body: { organizations: [{ id: "1", name: "One" }], pagination: noMore } },
    { body: { organizers: [{ id: "a", name: "A" }], pagination: noMore } },
  ]);
  const out = await resolveEventbriteFields(
    input(["organizationId", "organizerId"], { organizationId: "1" }),
    ctx,
  );
  assertEquals(calls.length, 2);
  assertEquals(Object.keys(out.fields).sort(), ["organizationId", "organizerId"]);
});

test("4xx: the field carries the error; the hook does not reject", async () => {
  const { ctx } = mockCtx([{ status: 401, body: { error: "x" } }]);
  const out = await resolveEventbriteFields(input(["organizationId"]), ctx);
  assertEquals(out.fields.organizationId?.options, undefined);
  assertEquals(typeof out.fields.organizationId?.error, "string");
});

const dyn = { source: "resolveFields" };
const find = (a: { params?: { key: string }[] }, k: string) =>
  a.params?.find((p) => p.key === k) as unknown as Record<string, unknown>;

test("params: create-event, create-venue, update-venue, get-organizer wired", async () => {
  const { default: createEvent, eventFieldParams } = await import("../../actions/create-event.ts");
  const { default: createVenue } = await import("../../actions/create-venue.ts");
  const { default: updateVenue } = await import("../../actions/update-venue.ts");
  const { default: getOrganizer } = await import("../../actions/get-organizer.ts");
  for (const a of [createEvent, createVenue, updateVenue, getOrganizer]) {
    assertEquals(a.resolveFields, resolveEventbriteFields);
  }
  for (const a of [createEvent, createVenue]) {
    assertEquals(find(a, "organizationId").options, dyn);
    assertEquals(find(a, "organizationId").config, { allowCustom: true });
    assertEquals(find(a, "organizationId").required, true);
    assertEquals(find(a, "organizerId").options, { ...dyn, refreshOn: ["organizationId"] });
    assertEquals(find(a, "organizerId").config, { allowCustom: true });
  }
  for (const a of [updateVenue, getOrganizer]) {
    assertEquals(find(a, "organizerId").options, dyn);
    assertEquals(find(a, "organizerId").config, { allowCustom: true });
  }
  assertEquals(find(getOrganizer, "organizerId").required, true);
  const upd = eventFieldParams({ create: false }).find((p) =>
    p.key === "organizerId"
  ) as unknown as Record<string, unknown>;
  assertEquals(upd.options, undefined);
  assertEquals(upd.config, undefined);
});

const ORGS = {
  body: { organizations: [{ id: "o1", name: "Acme" }], pagination: { has_more_items: false } },
};

test("scopeId: organization scope lists the user's organizations", async () => {
  const { ctx, calls } = mockCtx([ORGS]);
  const out = await resolveEventbriteFields(input(["scopeId"], { scope: "organization" }), ctx);
  assertEquals(calls.length, 1);
  assertEquals(calls[0].url, `${B}/users/me/organizations/`);
  assertEquals(out.fields.scopeId?.options, [{ value: "o1", label: "Acme" }]);
});

test("scopeId: venue, series and user scopes yield no options and make no request", async () => {
  for (const scope of ["venue", "series", "user"]) {
    const { ctx, calls } = mockCtx([]);
    const out = await resolveEventbriteFields(input(["scopeId"], { scope }), ctx);
    assertEquals(calls.length, 0, scope);
    assertEquals(out.fields.scopeId, { options: [] }, scope);
  }
});

test("scopeId: unresolved scope leaves scopeId out", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await resolveEventbriteFields(
    input(["scopeId"], { scope: "organization" }, ["scope"]),
    ctx,
  );
  assertEquals(calls.length, 0);
  assertEquals("scopeId" in out.fields, false);
});

test("scopeId + organizationId requested together fetch organizations once", async () => {
  const { ctx, calls } = mockCtx([ORGS]);
  const out = await resolveEventbriteFields(
    input(["organizationId", "scopeId"], { scope: "organization" }),
    ctx,
  );
  assertEquals(calls.length, 1);
  assertEquals(out.fields.organizationId?.options, out.fields.scopeId?.options);
});

const EVENTS_Q = "status=draft%2Clive%2Cstarted%2Cended&order_by=start_desc";
const ev = (id: string, name: string, day: string, status = "live") => ({
  id,
  name: { text: name, html: name },
  start: { local: `${day}T19:00:00` },
  status,
});

test("eventId: the chosen organization's events, labelled with their start date", async () => {
  const { ctx, calls } = mockCtx([{
    body: { events: [ev("e1", "Gala", "2026-12-01")], pagination: { has_more_items: false } },
  }]);
  const out = await resolveEventbriteFields(input(["eventId"], { organizationId: "o/1" }), ctx);
  assertEquals(calls.map((c) => c.url), [`${B}/organizations/o%2F1/events/?${EVENTS_Q}`]);
  assertEquals(out.fields.eventId?.options, [
    { value: "e1", label: "Gala · 2026-12-01", description: "live" },
  ]);
});

test("eventId: continuation pages keep the status and order filters", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: {
        events: [ev("e1", "A", "2026-12-01")],
        pagination: { has_more_items: true, continuation: "tok" },
      },
    },
    { body: { events: [ev("e2", "B", "2026-11-01")], pagination: { has_more_items: false } } },
  ]);
  const out = await resolveEventbriteFields(input(["eventId"], { organizationId: "5" }), ctx);
  assertEquals(calls[1].url, `${B}/organizations/5/events/?${EVENTS_Q}&continuation=tok`);
  assertEquals(out.fields.eventId?.options?.map((o) => o.value), ["e1", "e2"]);
});

test("eventId: no organization -> every organization's events, each tagged with its org", async () => {
  const noMore = { has_more_items: false };
  const { ctx, calls } = mockCtx([
    { body: { organizations: [{ id: "1", name: "One" }, { id: "2" }], pagination: noMore } },
    { body: { events: [ev("a", "A", "2026-12-01")], pagination: noMore } },
    { body: { events: [{ id: "b", name: null }], pagination: noMore } },
  ]);
  const out = await resolveEventbriteFields(input(["eventId"], {}), ctx);
  assertEquals(calls.map((c) => c.url), [
    `${B}/users/me/organizations/`,
    `${B}/organizations/1/events/?${EVENTS_Q}`,
    `${B}/organizations/2/events/?${EVENTS_Q}`,
  ]);
  assertEquals(out.fields.eventId?.options, [
    { value: "a", label: "A · 2026-12-01", description: "One · live" },
    { value: "b", label: "b", description: "2" },
  ]);
});

test("eventId: an unresolved organizationId leaves eventId out", async () => {
  const { ctx, calls } = mockCtx([]);
  const out = await resolveEventbriteFields(input(["eventId"], {}, ["organizationId"]), ctx);
  assertEquals(calls.length, 0);
  assertEquals("eventId" in out.fields, false);
});

test("eventId + organizationId together fetch organizations once", async () => {
  const noMore = { has_more_items: false };
  const { ctx, calls } = mockCtx([
    { body: { organizations: [{ id: "1", name: "One" }], pagination: noMore } },
    { body: { events: [ev("a", "A", "2026-12-01")], pagination: noMore } },
  ]);
  const out = await resolveEventbriteFields(input(["organizationId", "eventId"], {}), ctx);
  assertEquals(calls.length, 2);
  assertEquals(out.fields.organizationId?.options, [{ value: "1", label: "One" }]);
  assertEquals(out.fields.eventId?.options?.length, 1);
});

test("scopeId: event scope lists events of the form's organization", async () => {
  const { ctx, calls } = mockCtx([{
    body: { events: [ev("e1", "Gala", "2026-12-01")], pagination: { has_more_items: false } },
  }]);
  const out = await resolveEventbriteFields(
    input(["scopeId"], { scope: "event", organizationId: "9" }),
    ctx,
  );
  assertEquals(calls.map((c) => c.url), [`${B}/organizations/9/events/?${EVENTS_Q}`]);
  assertEquals(out.fields.scopeId?.options?.map((o) => o.value), ["e1"]);
});
