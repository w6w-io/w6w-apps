import { assert, assertEquals } from "@std/assert";
import appointmentList from "../../actions/appointment-list.ts";
import { mockCtx, pathOf, queryOf } from "../_helpers.ts";

const PAGE = {
  appointments: [{ title: "Demo", start_date: "2026-01-15T09:00:00.000Z" }],
  count: 120,
  next: "https://api.infusionsoft.com/crm/rest/v1/appointments?limit=50&offset=50",
  previous: null,
};

/**
 * The one v1 call in this app, and it is v1 because it has to be: the v2
 * document declares 236 paths and not one of them is an appointment.
 */
Deno.test("appointment-list: uses the v1 prefix, which is where appointments live", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await appointmentList.execute({}, ctx);
  assertEquals(pathOf(calls[0].url), "/crm/rest/v1/appointments");
  assert(!calls[0].url.includes("/rest/v2/"));
});

/**
 * The spec declares one object-typed query parameter,
 * `appointmentSearchCommand`, with no style or explode. There is no such
 * parameter on the wire — the real ones are that object's own properties, sent
 * flat.
 */
Deno.test("appointment-list: sends the command object's properties flat, not the object", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await appointmentList.execute(
    { since: "2026-01-01T00:00:00.000Z", contactId: "9", limit: 25, offset: 50 },
    ctx,
  );
  assertEquals(queryOf(calls[0].url), {
    since: "2026-01-01T00:00:00.000Z",
    contact_id: "9",
    limit: "25",
    offset: "50",
  });
  assertEquals(queryOf(calls[0].url).appointmentSearchCommand, undefined);
});

/**
 * v1 pages by offset/limit and returns `next` as a fully-formed absolute URL,
 * where v2 returns an opaque cursor. The two are not interchangeable.
 */
Deno.test("appointment-list: reads the next offset out of v1's absolute next URL", async () => {
  const { ctx } = mockCtx([{ body: PAGE }]);
  const out = await appointmentList.execute({}, ctx) as { count?: number; nextOffset?: number };
  assertEquals(out.nextOffset, 50);
  // v1's `count` is the total, not the page length.
  assertEquals(out.count, 120);
});

Deno.test("appointment-list: a final page reports no next offset", async () => {
  const { ctx } = mockCtx([{ body: { appointments: [], count: 0 } }]);
  const out = await appointmentList.execute({}, ctx) as { nextOffset?: number };
  assertEquals(out.nextOffset, undefined);
});

Deno.test("appointment-list: offset zero is sent rather than dropped as falsy", async () => {
  const { ctx, calls } = mockCtx([{ body: PAGE }]);
  await appointmentList.execute({ offset: 0, limit: 10 }, ctx);
  assertEquals(queryOf(calls[0].url).offset, "0");
});
