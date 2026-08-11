import { assert, assertEquals } from "@std/assert";
import action from "../../actions/list-lists.ts";
import { mockCtx } from "../_helpers.ts";

Deno.test("list-lists: GETs /lists on the versionless api host", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [], paging: {} } }]);
  await action.execute!({}, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.origin, "https://api.emailoctopus.com");
  // v2 puts the version in the HOST, not the path — no `/v2` segment.
  assertEquals(url.pathname, "/lists");
  assertEquals(calls[0].method, "GET");
  assertEquals([...url.searchParams.keys()], [], "no invented defaults");
});

Deno.test("list-lists: forwards limit and the opaque cursor", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({ limit: 25, startingAfter: "WyIyMDI0LTEy" }, ctx);
  const p = new URL(calls[0].url).searchParams;
  assertEquals(p.get("limit"), "25");
  assertEquals(p.get("starting_after"), "WyIyMDI0LTEy");
});

Deno.test("list-lists: is a search action returning the paging envelope verbatim", async () => {
  assertEquals(action.type, "search");
  const body = {
    data: [{ id: "l1", name: "Clients" }],
    paging: {
      next: { url: "https://api.emailoctopus.com/lists?starting_after=c", starting_after: "c" },
    },
  };
  const { ctx } = mockCtx([{ body }]);
  assertEquals(await action.execute!({}, ctx), body);
});

Deno.test("list-lists: sends no authorization header of its own", async () => {
  const { ctx, calls } = mockCtx([{ body: { data: [] } }]);
  await action.execute!({}, ctx);
  assert(!("authorization" in calls[0].headers), "the sign hook injects credentials, not actions");
});
