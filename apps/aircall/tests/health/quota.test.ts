import { assert, assertEquals } from "@std/assert";
import quota, {
  DOCUMENTED_LIMIT,
  parseCount,
  parseResetAt,
  PING_URL,
  readHeadroom,
} from "../../health/quota.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

function headers(over: Record<string, string> = {}): Headers {
  return new Headers({ "content-type": "application/json", ...over });
}

Deno.test("quota: rides on a signed GET /v1/ping", async () => {
  const { ctx, calls } = mockCtx([
    {
      body: { ping: "pong" },
      headers: { "content-type": "application/json", "x-aircallapi-remaining": "118" },
    },
  ]);
  const report = await quota.check!({}, ctx);

  assertEquals(PING_URL, "https://api.aircall.io/v1/ping");
  assertEquals(pathOf(calls[0].url), "/v1/ping");
  assertEquals(report.state, "ok");
});

/**
 * The whole reason this check is `informational`: Aircall documents the
 * X-AircallApi-* headers as present "when the rate limit has been reached", so
 * their absence is the expected steady state — and `unknown` outranks `ok` in
 * the roll-up.
 */
Deno.test("quota: absent headers report unknown, and say why", () => {
  const report = readHeadroom(headers());
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("when the rate limit has been reached"), report.message);
  assert(report.message!.includes("120"), report.message);
  assertEquals(quota.severity, "informational");
});

Deno.test("quota: present headers become a quota reading", () => {
  const report = readHeadroom(headers({
    "x-aircallapi-limit": "120",
    "x-aircallapi-remaining": "97",
    "x-aircallapi-reset": "1584998210",
  }));

  assertEquals(report.state, "ok");
  assertEquals(report.quota![0].limit, 120);
  assertEquals(report.quota![0].remaining, 97);
  assertEquals(report.quota![0].unit, "requests");
  assertEquals(report.quota![0].resetAt, "2020-03-23T21:16:50.000Z");
});

Deno.test("quota: a missing limit header falls back to the documented ceiling", () => {
  const report = readHeadroom(headers({ "x-aircallapi-remaining": "60" }));
  assertEquals(report.quota![0].limit, DOCUMENTED_LIMIT);
  assertEquals(report.state, "ok");
});

Deno.test("quota: near-exhaustion is degraded", () => {
  const report = readHeadroom(headers({
    "x-aircallapi-limit": "120",
    "x-aircallapi-remaining": "9",
  }));
  assertEquals(report.state, "degraded");
  assert(report.message!.includes("nearly exhausted"), report.message);
});

/**
 * Exhausted is `degraded`, not `down`: the window is 60 seconds wide and refills
 * on its own, so this is a queue rather than an outage.
 */
Deno.test("quota: full exhaustion is degraded, not down", () => {
  const report = readHeadroom(headers({
    "x-aircallapi-limit": "120",
    "x-aircallapi-remaining": "0",
  }));
  assertEquals(report.state, "degraded");
  assert(report.message!.includes("exhausted"), report.message);
  assertEquals(report.quota![0].remaining, 0);
});

/** A malformed ceiling is unknown, not "every account is out of quota". */
Deno.test("quota: a non-positive limit is unknown", () => {
  const report = readHeadroom(headers({
    "x-aircallapi-limit": "0",
    "x-aircallapi-remaining": "0",
  }));
  assertEquals(report.state, "unknown");
});

Deno.test("quota: a 429 is reported as an active rate limit, with its headers read", async () => {
  const { ctx } = mockCtx([
    {
      status: 429,
      body: { error: "Too Many Requests" },
      headers: {
        "content-type": "application/json",
        "x-aircallapi-limit": "120",
        "x-aircallapi-remaining": "0",
        "x-aircallapi-reset": "1584998210",
      },
    },
  ]);
  const report = await quota.check!({}, ctx);

  assertEquals(report.state, "degraded");
  assert(report.message!.includes("currently rate-limiting"), report.message);
  assertEquals(report.quota![0].remaining, 0);
});

/**
 * A rejected credential says nothing about headroom — that is `auth:basic`'s
 * question, and answering it twice reports one problem as two.
 */
Deno.test("quota: a 403 is unknown, not degraded", async () => {
  const { ctx } = mockCtx([{ status: 403, body: { message: "Forbidden" } }]);
  const report = await quota.check!({}, ctx);
  assertEquals(report.state, "unknown");
  assert(report.message!.includes("headroom could not be read"), report.message);
});

/**
 * The reference states no unit for X-AircallApi-Reset, so both are handled. A
 * silently-wrong conversion here renders a reset a thousand times too far away.
 */
Deno.test("quota: the reset header is read as seconds or milliseconds", () => {
  assertEquals(parseResetAt("1584998210"), "2020-03-23T21:16:50.000Z");
  assertEquals(parseResetAt("1584998210000"), "2020-03-23T21:16:50.000Z");
  assertEquals(parseResetAt(null), undefined);
  assertEquals(parseResetAt(""), undefined);
  assertEquals(parseResetAt("not-a-number"), undefined);
  assertEquals(parseResetAt("0"), undefined);
});

Deno.test("quota: parseCount rejects anything that is not a non-negative number", () => {
  assertEquals(parseCount("97"), 97);
  assertEquals(parseCount("0"), 0);
  assertEquals(parseCount(null), undefined);
  assertEquals(parseCount(""), undefined);
  assertEquals(parseCount("-1"), undefined);
  assertEquals(parseCount("many"), undefined);
});

Deno.test("quota: is signed, per-connection, and declares no extra egress", () => {
  assertEquals(quota.credential, "signed");
  assertEquals(quota.scope, "connection");
  assertEquals(quota.network, undefined);
});
