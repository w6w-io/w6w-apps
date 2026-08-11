import { assertEquals } from "@std/assert";
import orgList from "../../actions/org-list.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

const ORGS = [
  {
    org_id: 1,
    name: "Acme",
    url: "https://acme.podio.com",
    spaces: [{ space_id: 7, name: "Sales" }],
  },
];

Deno.test("org-list: GETs /org/ with no parameters", async () => {
  const { ctx, calls } = mockCtx([{ body: ORGS }]);
  const out = await orgList.execute({}, ctx);
  assertEquals(out, { organizations: ORGS });
  assertEquals(calls.length, 1);
  assertEquals(calls[0].method, "GET");
  assertEquals(calls[0].url, "https://api.podio.com/org/");
  assertEquals(pathOf(calls[0].url), "/org/");
});

Deno.test("org-list: an empty account yields an empty list, not undefined", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "" }]);
  assertEquals(await orgList.execute({}, ctx), { organizations: [] });
});

Deno.test("org-list: declares no params, so a host can invoke it with {}", () => {
  assertEquals(orgList.params, []);
  assertEquals(orgList.type, "read");
});
