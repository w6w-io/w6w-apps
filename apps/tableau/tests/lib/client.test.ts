import { assert, assertEquals, assertRejects } from "@std/assert";
import { mockCtx } from "../_helpers.ts";
import {
  normalizeBaseUrl,
  parseEstimatedExpiration,
  readPagination,
  signIn,
  signOut,
  TableauClient,
  tableauErrorMessage,
  unwrapList,
} from "../../lib/client.ts";

Deno.test("normalizeBaseUrl: adds https, strips trailing slash, keeps host+scheme only", () => {
  assertEquals(normalizeBaseUrl("10ax.online.tableau.com"), "https://10ax.online.tableau.com");
  assertEquals(normalizeBaseUrl("https://myco.com/"), "https://myco.com");
  assertEquals(normalizeBaseUrl("http://myco.internal"), "http://myco.internal");
});

Deno.test("normalizeBaseUrl: rejects an empty or unparseable URL", () => {
  let threw = false;
  try {
    normalizeBaseUrl("");
  } catch {
    threw = true;
  }
  assert(threw, "empty URL must throw");
});

/** The docs are explicit: this is NOT hours:minutes:seconds. */
Deno.test("parseEstimatedExpiration: reads DAYS:HH:MM", () => {
  const ms = parseEstimatedExpiration("2:12:30")!;
  const expected = ((2 * 24 + 12) * 60 + 30) * 60 * 1000;
  assertEquals(ms, expected);
});

Deno.test("parseEstimatedExpiration: undefined/malformed input returns undefined", () => {
  assertEquals(parseEstimatedExpiration(undefined), undefined);
  assertEquals(parseEstimatedExpiration("not-a-duration"), undefined);
  assertEquals(parseEstimatedExpiration("1:2"), undefined);
});

Deno.test("tableauErrorMessage: reads the {error:{code,summary,detail}} envelope", () => {
  const msg = tableauErrorMessage(
    404,
    "Not Found",
    JSON.stringify({
      error: { code: "404002", summary: "Resource Not Found", detail: "User 'x'" },
    }),
  );
  assertEquals(msg, "Resource Not Found: User 'x' (404002)");
});

Deno.test("tableauErrorMessage: falls back to status when the body is not the envelope", () => {
  assertEquals(
    tableauErrorMessage(500, "Internal Server Error", ""),
    "Tableau returned 500 Internal Server Error",
  );
  assertEquals(
    tableauErrorMessage(500, "Internal Server Error", "not json"),
    "Tableau returned 500 Internal Server Error",
  );
});

/** The single-item-is-not-an-array quirk this whole app has to defend against. */
Deno.test("unwrapList: a single item is an object, not a 1-element array", () => {
  assertEquals(unwrapList({ project: { id: "p1" } }, "project"), [{ id: "p1" }]);
  assertEquals(unwrapList({ project: [{ id: "p1" }, { id: "p2" }] }, "project"), [
    { id: "p1" },
    { id: "p2" },
  ]);
  assertEquals(unwrapList(undefined, "project"), []);
  assertEquals(unwrapList({}, "project"), []);
});

Deno.test("readPagination: coerces the string-typed attributes to numbers", () => {
  const p = readPagination({
    pagination: { pageNumber: "2", pageSize: "50", totalAvailable: "158" },
  });
  assertEquals(p, { pageNumber: 2, pageSize: 50, totalAvailable: 158 });
  assertEquals(readPagination({}), undefined);
});

Deno.test("signIn: posts the PAT and returns the session, computing expiresAt from the DAYS:HH:MM field", async () => {
  const { ctx, calls } = mockCtx([{
    status: 200,
    body: {
      credentials: {
        token: "tok1",
        estimatedTimeToExpiration: "0:04:00",
        site: { id: "site-1" },
        user: { id: "user-1" },
      },
    },
  }]);
  const before = Date.now();
  const result = await signIn(ctx, {
    baseUrl: "https://10ax.online.tableau.com",
    siteContentUrl: "marketing",
    patName: "n1",
    patSecret: "s1",
    apiVersion: "3.21",
  });
  assertEquals(result.token, "tok1");
  assertEquals(result.siteId, "site-1");
  assertEquals(result.userId, "user-1");
  assert(result.expiresAt);
  assert(new Date(result.expiresAt!).getTime() >= before + 4 * 60 * 1000);

  assertEquals(calls[0].url, "https://10ax.online.tableau.com/api/3.21/auth/signin");
  assertEquals(calls[0].method, "POST");
  assertEquals(calls[0].headers["accept"], "application/json");
  const sentBody = JSON.parse(calls[0].body!);
  assertEquals(sentBody.credentials.personalAccessTokenName, "n1");
  assertEquals(sentBody.credentials.personalAccessTokenSecret, "s1");
  assertEquals(sentBody.credentials.site.contentUrl, "marketing");
});

Deno.test("signIn: a rejected PAT throws with the vendor's error text", async () => {
  const { ctx } = mockCtx([{
    status: 401,
    body: { error: { code: "401001", summary: "Login Error", detail: "bad credentials" } },
  }]);
  await assertRejects(
    () =>
      signIn(ctx, {
        baseUrl: "https://x.online.tableau.com",
        siteContentUrl: "",
        patName: "n",
        patSecret: "wrong",
        apiVersion: "3.21",
      }),
    Error,
    "Login Error",
  );
});

Deno.test("signOut: sends the session header and never throws on failure", async () => {
  const ok = mockCtx([{ status: 204 }]);
  await signOut(ok.ctx, { baseUrl: "https://x.com", apiVersion: "3.21", token: "tok1" });
  assertEquals(ok.calls[0].url, "https://x.com/api/3.21/auth/signout");
  assertEquals(ok.calls[0].headers["x-tableau-auth"], "tok1");

  const broken = mockCtx([]);
  await signOut(broken.ctx, { baseUrl: "https://x.com", apiVersion: "3.21", token: "tok1" });
  // no throw, and mockCtx would have thrown itself had a fetch actually fired
  // beyond the empty queue, so reaching here proves the call was attempted and
  // swallowed.
});

Deno.test("TableauClient.request: targets /api/{version}/sites/{siteId} and sends JSON accept", async () => {
  const { ctx, calls } = mockCtx([{ status: 200, body: { projects: { project: [] } } }], {
    display: { baseUrl: "https://10ax.online.tableau.com", siteId: "site-1", apiVersion: "3.21" },
  });
  const client = new TableauClient(ctx);
  await client.request("/projects");
  assertEquals(calls[0].url, "https://10ax.online.tableau.com/api/3.21/sites/site-1/projects");
  assertEquals(calls[0].headers["accept"], "application/json");
});

Deno.test("TableauClient.request: a non-2xx throws the formatted Tableau error", async () => {
  const { ctx } = mockCtx(
    [{ status: 403, body: { error: { code: "403004", summary: "Forbidden" } } }],
    { display: { baseUrl: "https://x.com", siteId: "s1", apiVersion: "3.21" } },
  );
  await assertRejects(() => new TableauClient(ctx).request("/projects"), Error, "Forbidden");
});

Deno.test("TableauClient.requestList: unwraps the wrapper and walks pages", async () => {
  // A full page (matching the 100 pageSize an unbounded read requests) forces
  // a second fetch; a short one is the end-of-collection signal.
  const full = Array.from({ length: 100 }, (_, i) => ({ id: `p${i}` }));
  const { ctx, calls } = mockCtx(
    [
      {
        status: 200,
        body: {
          pagination: { pageNumber: "1", pageSize: "100", totalAvailable: "101" },
          projects: { project: full },
        },
      },
      {
        status: 200,
        body: {
          pagination: { pageNumber: "2", pageSize: "100", totalAvailable: "101" },
          projects: { project: { id: "p100" } },
        },
      },
    ],
    { display: { baseUrl: "https://x.com", siteId: "s1", apiVersion: "3.21" } },
  );
  const client = new TableauClient(ctx);
  const items = await client.requestList("/projects", "projects", "project", {}, Infinity);
  assertEquals(items.length, 101);
  assertEquals(new URL(calls[1].url).searchParams.get("pageNumber"), "2");
});

Deno.test("TableauClient.requestBinary: base64-encodes the response and reports its content type", async () => {
  const { ctx } = mockCtx(
    [{ status: 200, body: "hi", headers: { "content-type": "image/png" } }],
    { display: { baseUrl: "https://x.com", siteId: "s1", apiVersion: "3.21" } },
  );
  const out = await new TableauClient(ctx).requestBinary("/views/v1/image");
  assertEquals(out.contentType, "image/png");
  assertEquals(atob(out.base64), "hi");
});
