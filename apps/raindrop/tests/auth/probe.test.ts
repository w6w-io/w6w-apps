import { assert, assertEquals } from "@std/assert";
import {
  classifyProbe,
  MISSING_CREDENTIAL_MESSAGE,
  PROBE_PATH,
  REJECTED_CREDENTIAL_MESSAGE,
} from "../../auth/probe.ts";
import { BAD_TOKEN_BODY, UNAUTHORIZED_BODY } from "../_helpers.ts";

Deno.test("probe: the endpoint is /user", () => {
  assertEquals(PROBE_PATH, "/user");
});

Deno.test("probe: a documented user response is a pass", () => {
  assertEquals(classifyProbe(200, { result: true, user: { _id: 32 } }, "test token"), { ok: true });
});

/**
 * **The finding.** Raindrop answers HTTP 401 for two different problems and only
 * the body tells them apart. Collapsing them is how "the credential never
 * reached the request" gets reported as "your token expired" — different
 * problems, different fixes.
 *
 * Both bodies below were measured live on 2026-08-11 against
 * `https://api.raindrop.io/rest/v1/user`.
 */
Deno.test("probe: the two 401 bodies produce two different diagnoses", () => {
  const missing = classifyProbe(401, UNAUTHORIZED_BODY, "test token");
  const rejected = classifyProbe(401, BAD_TOKEN_BODY, "test token");

  assertEquals(missing.ok, false);
  assertEquals(rejected.ok, false);
  assert(/did not reach the request/i.test(missing.message ?? ""), missing.message);
  assert(/Reconnect/i.test(missing.message ?? ""), missing.message);
  assert(/rejected the test token/i.test(rejected.message ?? ""), rejected.message);
  assert(/revoked or expired/i.test(rejected.message ?? ""), rejected.message);
  // The two are genuinely different text, not the same sentence twice.
  assert(missing.message !== rejected.message, "the two 401 cases were flattened into one message");
});

Deno.test("probe: the vendor's exact wordings are pinned", () => {
  assertEquals(MISSING_CREDENTIAL_MESSAGE, "Unauthorized");
  assertEquals(REJECTED_CREDENTIAL_MESSAGE, "Incorrect access_token");
});

/** The label names the credential, because the remedy differs per method. */
Deno.test("probe: the message names the credential kind it was given", () => {
  const oauth = classifyProbe(401, BAD_TOKEN_BODY, "access token");
  assert(/access token/.test(oauth.message ?? ""), oauth.message);
});

/**
 * **`res.ok` is necessary but not sufficient.** Raindrop's OAuth surface answers
 * HTTP 200 carrying `{"result": false}`, so a 200 whose body reports failure has
 * to fail here too.
 */
Deno.test("probe: a 200 whose body says result:false is not a pass", () => {
  const out = classifyProbe(200, { result: false, status: 400, errorMessage: "nope" }, "token");
  assertEquals(out.ok, false);
  assert(/body reports failure/i.test(out.message ?? ""), out.message);
  assert(/nope/.test(out.message ?? ""), out.message);
});

/** A 200 that is not the documented shape is not a pass either. */
Deno.test("probe: a 200 without a user object is not a pass", () => {
  const out = classifyProbe(200, { result: true }, "token");
  assertEquals(out.ok, false);
  assert(/without a user object/i.test(out.message ?? ""), out.message);
});

Deno.test("probe: an unparseable body is not a pass", () => {
  assertEquals(classifyProbe(200, null, "token").ok, false);
});

/**
 * A rate limit is not a verdict on the credential — Raindrop meters per
 * *authenticated* user, so a 429 arguably proves the opposite. Reporting "could
 * not determine" beats pronouncing a working token dead.
 */
Deno.test("probe: a 429 reports that the credential could not be verified", () => {
  const out = classifyProbe(429, { result: false, errorMessage: "too many" }, "token");
  assertEquals(out.ok, false);
  assert(/could not be verified/i.test(out.message ?? ""), out.message);
  assert(!/rejected|revoked/i.test(out.message ?? ""), out.message);
});

Deno.test("probe: any other status is reported with its code and the vendor's text", () => {
  const out = classifyProbe(503, { errorMessage: "maintenance" }, "token");
  assertEquals(out.ok, false);
  assert(out.message?.includes("503"), out.message);
  assert(out.message?.includes("maintenance"), out.message);
  assert(out.message?.includes("/user"), out.message);
});

/** Nothing the probe returns may ever carry the credential itself. */
Deno.test("probe: no classification echoes a token", () => {
  const outcomes = [
    classifyProbe(200, { result: true, user: { _id: 1 } }, "test token"),
    classifyProbe(401, UNAUTHORIZED_BODY, "test token"),
    classifyProbe(401, BAD_TOKEN_BODY, "access token"),
    classifyProbe(429, {}, "token"),
    classifyProbe(500, { errorMessage: "boom" }, "token"),
  ];
  for (const out of outcomes) {
    assert(
      !/[A-Za-z0-9]{20,}/.test(out.message ?? ""),
      `a long opaque string leaked into a probe message: ${out.message}`,
    );
  }
});
