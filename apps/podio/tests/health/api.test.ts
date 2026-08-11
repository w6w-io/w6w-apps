import { assert, assertEquals } from "@std/assert";
import api, { isPodioErrorEnvelope, PROBE_PATH, PROBE_URL } from "../../health/api.ts";
import { errorBody, mockCtx, NO_CREDENTIAL_401 } from "../_helpers.ts";

Deno.test("api: is an unsigned dependency check that adds no egress host", () => {
  assertEquals(api.kind, "dependency");
  assertEquals(api.scope, "app");
  assertEquals(api.credential, "none");
  // The API host is already the app's own; a dependency probe of it must not
  // widen egress, and must not be signed.
  assertEquals(api.network, undefined);
  assertEquals(PROBE_URL, "https://api.podio.com/user/status");
});

/**
 * The rule this check exists to honour: an unsigned probe that comes back with
 * a schema-correct auth error has proved reachability, so it is a PASS. Calling
 * it an outage is how "Podio is down" gets misreported as "your token expired".
 */
Deno.test("api: a schema-correct 401 is a PASS", async () => {
  const { ctx, calls } = mockCtx([{ status: 401, body: NO_CREDENTIAL_401 }]);
  const report = await api.check!({}, ctx);
  assertEquals(report.state, "ok");
  assert(report.message!.includes("documented 401 envelope"));
  assertEquals(calls[0].url, PROBE_URL);
  assertEquals(calls[0].headers.authorization, undefined, "the probe carried a credential");
});

/**
 * The condition that does the real work. Anything can serve a 401 with a JSON
 * body; only Podio's own error handler echoes back the path that was asked for.
 */
Deno.test("api: a 401 that is not Podio's envelope is unknown, not ok and not down", async () => {
  for (
    const body of [
      { error: "unauthorized" }, // no `request`
      { request: { url: "/user/status" } }, // no `error`
      { error: "unauthorized", request: { url: "/somewhere/else" } }, // wrong path
      "Access denied", // not JSON at all
      [],
    ]
  ) {
    const { ctx } = mockCtx([{ status: 401, body }]);
    const report = await api.check!({}, ctx);
    assertEquals(report.state, "unknown", `wrongly accepted ${JSON.stringify(body)}`);
    assert(report.message!.includes("not Podio's error envelope"));
  }
});

/**
 * `/user/status` requires a credential. An unauthenticated 200 means something
 * that is not Podio answered — a captive portal, a proxy, a parked domain.
 */
Deno.test("api: an unauthenticated 200 is a failure, not a pass", async () => {
  const { ctx } = mockCtx([{ status: 200, body: { user: { user_id: 1 } } }]);
  const report = await api.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("should never do"));
});

Deno.test("api: a 5xx is down, and an odd 4xx is unknown", async () => {
  const server = mockCtx([{ status: 503, body: "" }]);
  assertEquals((await api.check!({}, server.ctx)).state, "down");

  const odd = mockCtx([{ status: 418, body: "" }]);
  const report = await api.check!({}, odd.ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("418"));
});

Deno.test("api: a transport failure is down, with the cause in the message", async () => {
  // mockCtx throws when no response is queued, which is exactly a transport
  // failure from the hook's point of view.
  const { ctx } = mockCtx([]);
  const report = await api.check!({}, ctx);
  assertEquals(report.state, "down");
  assert(report.message!.includes("unreachable"));
});

Deno.test("isPodioErrorEnvelope: requires a non-empty error AND the echoed path", () => {
  assert(isPodioErrorEnvelope(NO_CREDENTIAL_401, PROBE_PATH));
  assert(isPodioErrorEnvelope(errorBody("unauthorized", "expired_token"), PROBE_PATH));
  assert(!isPodioErrorEnvelope({ error: "", request: { url: PROBE_PATH } }, PROBE_PATH));
  assert(!isPodioErrorEnvelope({ error: "x" }, PROBE_PATH));
  assert(!isPodioErrorEnvelope({ error: "x", request: { url: "/other" } }, PROBE_PATH));
  assert(!isPodioErrorEnvelope(null, PROBE_PATH));
  assert(!isPodioErrorEnvelope("nope", PROBE_PATH));
  assert(!isPodioErrorEnvelope([NO_CREDENTIAL_401], PROBE_PATH));
});

/**
 * The path is echoed with the query string appended, so the check matches on a
 * prefix rather than on equality.
 */
Deno.test("isPodioErrorEnvelope: tolerates the query string Podio appends to the echoed path", () => {
  const body = errorBody("unauthorized", "expired_token", `${PROBE_PATH}?x=1`);
  assert(isPodioErrorEnvelope(body, PROBE_PATH));
});
