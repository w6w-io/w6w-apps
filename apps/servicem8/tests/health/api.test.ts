import { assertEquals } from "@std/assert";
import api, { EXPECTED_401_BODY, PROBE_URL } from "../../health/api.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

Deno.test("health/api: a 401 with ServiceM8's plain-text body is ok", async () => {
  const { ctx, calls } = mockCtx([
    { status: 401, body: EXPECTED_401_BODY, headers: { "content-type": "text/html" } },
  ]);
  const out = await api.check!({}, ctx);
  assertEquals(out.state, "ok");
  assertEquals(pathOf(calls[0].url), pathOf(PROBE_URL));
});

Deno.test("health/api: a 401 with a different body is down", async () => {
  const { ctx } = mockCtx([{ status: 401, body: "<html>captive portal</html>" }]);
  const out = await api.check!({}, ctx);
  assertEquals(out.state, "down");
});

Deno.test("health/api: a 200 with no credential is a security regression, reported degraded", async () => {
  const { ctx } = mockCtx([{ status: 200, body: [] }]);
  const out = await api.check!({}, ctx);
  assertEquals(out.state, "degraded");
});

Deno.test("health/api: a 5xx is down", async () => {
  const { ctx } = mockCtx([{ status: 503, body: "" }]);
  const out = await api.check!({}, ctx);
  assertEquals(out.state, "down");
});

Deno.test("health/api: credential posture is none and scope is app", () => {
  assertEquals(api.credential, "none");
  assertEquals(api.scope, "app");
  assertEquals(api.kind, "dependency");
});
