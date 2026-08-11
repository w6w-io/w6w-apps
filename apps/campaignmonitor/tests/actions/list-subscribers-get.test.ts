import { assertEquals, assertRejects } from "@std/assert";
import listSubscribersGet, { SUBSCRIBER_STATES } from "../../actions/list-subscribers-get.ts";
import { API_PATH, mockCtx, pagedBody, pathOf, queryOf } from "../_helpers.ts";

/**
 * All five state paths, derived from the exported list rather than hand-typed,
 * so a sixth state added to the action is covered here the moment it is added.
 */
Deno.test("list-subscribers-get: every declared state maps to its own path", async () => {
  for (const state of SUBSCRIBER_STATES) {
    const { ctx, calls } = mockCtx([{ body: pagedBody([]) }]);
    await listSubscribersGet.execute({ listId: "lid", state }, ctx);
    assertEquals(pathOf(calls[0].url), `${API_PATH}/lists/lid/${state}.json`);
  }
  assertEquals(SUBSCRIBER_STATES.length, 5);
});

Deno.test("list-subscribers-get: the select options are exactly the five state paths", () => {
  const options = (listSubscribersGet.params ?? [])
    .find((p) => p.key === "state")?.options as Array<{ value: string }>;
  assertEquals(options.map((o) => o.value).sort(), [...SUBSCRIBER_STATES].sort());
});

Deno.test("list-subscribers-get: defaults to active", async () => {
  const { ctx, calls } = mockCtx([{ body: pagedBody([]) }]);
  await listSubscribersGet.execute({ listId: "lid" }, ctx);
  assertEquals(pathOf(calls[0].url), `${API_PATH}/lists/lid/active.json`);
});

/**
 * An unknown segment would build a path that this API answers with a 401, which
 * reads like a rejected key. Refusing before the request keeps the error honest.
 */
Deno.test("list-subscribers-get: rejects an unknown state without spending a request", async () => {
  const { ctx, calls } = mockCtx([]);
  await assertRejects(
    async () => await listSubscribersGet.execute({ listId: "lid", state: "../../admins" }, ctx),
    Error,
    "State must be one of",
  );
  assertEquals(calls.length, 0);
});

Deno.test("list-subscribers-get: maps every parameter to its lowercase API name", async () => {
  const { ctx, calls } = mockCtx([{ body: pagedBody([]) }]);
  await listSubscribersGet.execute({
    listId: "lid",
    state: "bounced",
    date: "2026-01-01",
    page: 2,
    pageSize: 10,
    orderField: "email",
    orderDirection: "desc",
    includeTrackingPreference: true,
    includeSmsPreference: true,
  }, ctx);
  assertEquals(queryOf(calls[0].url), {
    date: "2026-01-01",
    page: "2",
    pagesize: "10",
    orderfield: "email",
    orderdirection: "desc",
    includetrackingpreference: "true",
    includesmspreference: "true",
  });
});

/**
 * `false` must survive rather than be dropped as "unset": it is the API's own
 * default, but sending it explicitly is a different statement from omitting it.
 */
Deno.test("list-subscribers-get: an explicit false consent flag is sent, not dropped", async () => {
  const { ctx, calls } = mockCtx([{ body: pagedBody([]) }]);
  await listSubscribersGet.execute(
    { listId: "lid", includeTrackingPreference: false },
    ctx,
  );
  assertEquals(queryOf(calls[0].url).includetrackingpreference, "false");
});
