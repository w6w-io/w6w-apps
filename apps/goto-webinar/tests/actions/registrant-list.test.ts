import { assertEquals } from "@std/assert";
import registrantList from "../../actions/registrant-list.ts";
import { mockCtxWithOrganizer, pathOf, queryOf } from "../_helpers.ts";

Deno.test("registrant-list: pages with `limit`, not `size` — the endpoint-specific spelling", async () => {
  const { ctx, calls } = mockCtxWithOrganizer(
    [{ body: [{ registrantKey: 1 }] }],
    "org-1",
  );
  const out = await registrantList.execute({ webinarKey: "9", page: 0, limit: 10 }, ctx) as {
    registrants: unknown[];
  };

  assertEquals(pathOf(calls[0].url), "/G2W/rest/v2/organizers/org-1/webinars/9/registrants");
  const q = queryOf(calls[0].url);
  assertEquals(q.limit, "10");
  assertEquals("size" in q, false, "registrants pages with `limit`, unlike webinar-list's `size`");
  assertEquals(out.registrants, [{ registrantKey: 1 }]);
});

Deno.test("registrant-list: the response is a bare array, unlike webinar-list's _embedded wrapper", async () => {
  const { ctx } = mockCtxWithOrganizer([{ body: [] }], "org-1");
  const out = await registrantList.execute({ webinarKey: "9" }, ctx) as { registrants: unknown[] };
  assertEquals(out.registrants, []);
});
