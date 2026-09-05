import { assertEquals } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import organizationGet from "../../actions/organization-get.ts";

Deno.test("organization-get: fetches an organization by numeric id, unquoted", async () => {
  const { ctx, calls } = mockCtx([{
    body: { data: { organization: { id: "12345", name: "Acme", planName: "pro" } } },
  }]);
  const out = await organizationGet.execute({ id: "12345" }, ctx) as { name: string };
  assertEquals(out.name, "Acme");
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.query, "{ organization(id: 12345) { id name planName createdAt } }");
});

Deno.test("organization-get: type/resource metadata", () => {
  assertEquals(organizationGet.type, "read");
  assertEquals(organizationGet.resource, "organization");
});
