import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import action from "../../actions/list-notebooks.ts";

Deno.test("list-notebooks: defaults to /me", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [{ id: "n1" }] } }]);
  const out = await action.execute({}, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/me/onenote/notebooks");
  assertEquals(out.value.length, 1);
  assertEquals(out.pages, 1);
});

Deno.test("list-notebooks: a non-me location addresses that location", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ location: "group", locationId: "g1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v1.0/groups/g1/onenote/notebooks");
});

Deno.test("list-notebooks: $select, $expand and $top ride as query parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ select: ["displayName"], expand: ["sections"], top: 5 }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.searchParams.get("$select"), "displayName");
  assertEquals(url.searchParams.get("$expand"), "sections");
  assertEquals(url.searchParams.get("$top"), "5");
});

Deno.test("list-notebooks: nextLink is replayed verbatim, ignoring other params", async () => {
  const nextLink = "https://graph.microsoft.com/v1.0/me/onenote/notebooks?$skip=20";
  const { ctx, calls } = mockCtx([{ body: { value: [] } }]);
  await action.execute({ nextLink, top: 99 }, ctx);
  assertEquals(calls[0].url, nextLink);
});

Deno.test("list-notebooks: fetch all pages walks @odata.nextLink up to maxPages", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: { value: [{ id: "n1" }], "@odata.nextLink": "https://graph.microsoft.com/v1.0/x?p=2" },
    },
    { body: { value: [{ id: "n2" }] } },
  ]);
  const out = await action.execute({ all: true }, ctx);
  assertEquals(calls.length, 2);
  assertEquals(out.value.map((n) => n.id), ["n1", "n2"]);
  assertEquals(out.nextLink, undefined);
});

Deno.test("list-notebooks: is a read action grouped under the notebook resource", () => {
  assertEquals(action.type, "read");
  assertEquals(action.resource, "notebook");
});
