import { assertEquals } from "@std/assert";
import companyDomain from "../../health/company-domain.ts";
import { mockBooqableCtx, mockCtx } from "../_helpers.ts";

Deno.test("company-domain: is a connection-scoped, context-credential dependency check", () => {
  assertEquals(companyDomain.kind, "dependency");
  assertEquals(companyDomain.scope, "connection");
  assertEquals(companyDomain.credential, "context");
  assertEquals(companyDomain.covers, ["*"]);
  assertEquals(companyDomain.network, undefined);
});

Deno.test("company-domain: an unsigned 401 passes — the company exists and is serving", async () => {
  const { ctx, calls } = mockBooqableCtx([{
    status: 401,
    body: { errors: [{ code: "unauthorized", title: "Access denied" }] },
  }]);
  const out = await companyDomain.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals("authorization" in calls[0].headers, false);
});

Deno.test("company-domain: a 404 means the company slug doesn't exist", async () => {
  const { ctx } = mockBooqableCtx([{
    status: 404,
    body: { errors: [{ code: "resources_not_found", title: "Resource(s) not found" }] },
  }]);
  const out = await companyDomain.check!({}, ctx);
  assertEquals(out.state, "down");
});

Deno.test("company-domain: a 5xx is down", async () => {
  const { ctx } = mockBooqableCtx([{ status: 503, body: {} }]);
  assertEquals((await companyDomain.check!({}, ctx)).state, "down");
});

Deno.test("company-domain: unknown when the connection records no company slug", async () => {
  const { ctx } = mockCtx();
  assertEquals((await companyDomain.check!({}, ctx)).state, "unknown");
});
