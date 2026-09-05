import { assertEquals } from "@std/assert";
import sessionList from "../../actions/session-list.ts";
import { mockCtxWithOrganizer, pathOf } from "../_helpers.ts";

Deno.test("session-list: unwraps _embedded.sessionInfoResources", async () => {
  const { ctx, calls } = mockCtxWithOrganizer(
    [{ body: { _embedded: { sessionInfoResources: [{ sessionKey: "s1" }] } } }],
    "org-1",
  );
  const out = await sessionList.execute({ webinarKey: "9" }, ctx) as { sessions: unknown[] };
  assertEquals(pathOf(calls[0].url), "/G2W/rest/v2/organizers/org-1/webinars/9/sessions");
  assertEquals(out.sessions, [{ sessionKey: "s1" }]);
});

Deno.test("session-list: defaults to an empty array when _embedded is absent", async () => {
  const { ctx } = mockCtxWithOrganizer([{ body: {} }], "org-1");
  const out = await sessionList.execute({ webinarKey: "9" }, ctx) as { sessions: unknown[] };
  assertEquals(out.sessions, []);
});
