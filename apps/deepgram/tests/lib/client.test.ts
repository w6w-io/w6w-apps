import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  compact,
  csv,
  DeepgramClient,
  describeError,
  isoDate,
  projectIdFromConnection,
  query,
} from "../../lib/client.ts";

const display = { projectId: "proj_1", projectName: "Acme" };

Deno.test("compact: drops unset keys so a default is not overwritten with nothing", () => {
  assertEquals(compact({ a: 1, b: undefined, c: null, d: "", e: [], f: false }), {
    a: 1,
    f: false,
  });
});

Deno.test("query: keeps numbers, booleans and arrays; drops blanks", () => {
  assertEquals(query({ a: 1, b: true, c: "x", d: "", e: undefined, f: ["p", "q"] }), {
    a: 1,
    b: true,
    c: "x",
    f: ["p", "q"],
  });
});

Deno.test("csv: splits, trims and drops empties; blank means unset", () => {
  assertEquals(csv("a, b ,,c"), ["a", "b", "c"]);
  assertEquals(csv(""), undefined);
});

/** The usage endpoints take a plain date and misread a timestamp silently. */
Deno.test("isoDate: normalises to YYYY-MM-DD and passes a plain date through", () => {
  assertEquals(isoDate("2026-08-18T12:00:00Z", "start"), "2026-08-18");
  assertEquals(isoDate("2026-08-18", "start"), "2026-08-18");
  assertEquals(isoDate("", "start"), undefined);
});

Deno.test("isoDate: refuses something that is not a date, by field name", () => {
  try {
    isoDate("last tuesday", "start");
    throw new Error("expected a throw");
  } catch (err) {
    assert(String(err).includes("`start`"), String(err));
  }
});

/** A key belongs to one project, discovered at connect time. */
Deno.test("projectIdFromConnection: refuses with an actionable message when unset", () => {
  assertEquals(projectIdFromConnection({ display } as never), "proj_1");
  try {
    projectIdFromConnection({ display: {} } as never);
    throw new Error("expected a throw");
  } catch (err) {
    assert(/reconnect/.test(String(err)), String(err));
  }
});

Deno.test("client: builds the URL and sets no authorization", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { projects: [] } }], { display });
  await new DeepgramClient(ctx).request("/v1/projects");
  assertEquals(calls[0].url, "https://api.deepgram.com/v1/projects");
  assertEquals(calls[0].headers["authorization"], undefined);
});

/** Deepgram repeats a key for list parameters rather than joining them. */
Deno.test("client: an array query value becomes repeated keys", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: {} }], { display });
  await new DeepgramClient(ctx).request("/v1/listen", {
    method: "POST",
    body: { url: "https://x/a.mp3" },
    query: { keyterm: ["Postgres", "w6w"] },
  });
  assertEquals(new URL(calls[0].url).searchParams.getAll("keyterm"), ["Postgres", "w6w"]);
});

Deno.test("client: a 204 answers undefined rather than failing to parse", async () => {
  const { ctx } = mockCtx([{ status: 204 }], { display });
  assertEquals(
    await new DeepgramClient(ctx).request("/v1/projects/proj_1/keys/k1", { method: "DELETE" }),
    undefined,
  );
});

/**
 * Deepgram's three services report failures in three shapes — verified
 * 2026-08-18 — and a client that reads one renders the others as noise.
 */
Deno.test("describeError: reads the management shape", () => {
  const out = describeError(
    401,
    JSON.stringify({
      category: "UNAUTHORIZED",
      message: "Authentication failed.",
      details: "Check that you are using the correct credentials.",
      request_id: "bd226c35",
    }),
  );
  assert(out.includes("Authentication failed."), out);
  assert(out.includes("UNAUTHORIZED"), out);
  assert(out.includes("bd226c35"), out);
});

Deno.test("describeError: reads the transcription shape", () => {
  const out = describeError(
    401,
    JSON.stringify({
      err_code: "INVALID_AUTH",
      err_msg: "Invalid credentials.",
      request_id: "01a",
    }),
  );
  assert(out.includes("Invalid credentials."), out);
  assert(out.includes("INVALID_AUTH"), out);
});

Deno.test("describeError: survives the plain-text shape the auth endpoints use", () => {
  const out = describeError(401, "Invalid credentials.");
  assert(out.includes("Invalid credentials."), out);
});

Deno.test("describeError: a 401 explains that key scopes are fixed at creation", () => {
  assert(/scopes/.test(describeError(401, "{}")));
});

/**
 * Deepgram meters concurrency, not requests per minute — so the fix is fewer
 * parallel steps, and a backoff that then fires everything at once fails again.
 */
Deno.test("describeError: a 429 says concurrency, not rate", () => {
  const out = describeError(429, "{}");
  assert(/CONCURRENT/.test(out), out);
  assert(/Fewer parallel steps/.test(out), out);
});

Deno.test("client: an error carries the method, the path and Deepgram's message", async () => {
  const { ctx } = mockCtx([{
    status: 404,
    body: { category: "NOT_FOUND", message: "Project not found." },
  }], { display });
  await assertRejects(
    async () => await new DeepgramClient(ctx).request("/v1/projects/nope"),
    Error,
    "Deepgram 404 for GET /v1/projects/nope: Project not found.",
  );
});
