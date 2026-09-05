import { assert, assertEquals } from "@std/assert";
import { DISPLAY, mockCtx } from "../_helpers.ts";
import site from "../../health/site.ts";

Deno.test("site: declares kind/scope/credential correctly", () => {
  assertEquals(site.kind, "dependency");
  assertEquals(site.scope, "connection");
  assertEquals(site.credential, "context");
});

Deno.test("site: unknown when the connection records no site URL", async () => {
  const { ctx } = mockCtx();
  const result = await site.check!({}, ctx);
  assertEquals(result.state, "unknown");
});

Deno.test("site: ok when /wp-json/ answers 200 and lists frm/v3", async () => {
  const { ctx, calls } = mockCtx(
    [{ status: 200, body: { namespaces: ["oembed/1.0", "frm/v3"] } }],
    { display: DISPLAY },
  );
  const result = await site.check!({}, ctx);
  assertEquals(result.state, "ok");
  assertEquals(new URL(calls[0].url).pathname, "/wp-json/");
});

Deno.test("site: ok when namespaces is absent (advisory, not authoritative)", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { routes: {} } }], { display: DISPLAY });
  const result = await site.check!({}, ctx);
  assertEquals(result.state, "ok");
});

Deno.test("site: degraded when namespaces is present but frm/v3 is missing", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { namespaces: ["oembed/1.0"] } }], {
    display: DISPLAY,
  });
  const result = await site.check!({}, ctx);
  assertEquals(result.state, "degraded");
  assert((result.message ?? "").includes("Global Settings -> API"));
});

Deno.test("site: down on a 404/401/403 at the REST root", async () => {
  for (const status of [401, 403, 404]) {
    const { ctx } = mockCtx([{ status }], { display: DISPLAY });
    const result = await site.check!({}, ctx);
    assertEquals(result.state, "down", String(status));
  }
});

Deno.test("site: down on a 5xx", async () => {
  const { ctx } = mockCtx([{ status: 503 }], { display: DISPLAY });
  const result = await site.check!({}, ctx);
  assertEquals(result.state, "down");
});

Deno.test("site: degraded on a non-JSON 200 body", async () => {
  const { ctx } = mockCtx([{ status: 200, body: "<html>not json</html>" }], { display: DISPLAY });
  const result = await site.check!({}, ctx);
  assertEquals(result.state, "degraded");
});
