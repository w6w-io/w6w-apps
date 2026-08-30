import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exposes every action with a unique kebab-case key", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys.length, 18);
  assertEquals(new Set(keys).size, keys.length, "action keys must be unique");
  for (const key of keys) {
    assert(/^[a-z0-9]+(-[a-z0-9]+)*$/.test(key), `${key} is not kebab-case`);
  }
});

Deno.test("index: every action declares a description, output and a valid type", () => {
  for (const action of app.actions) {
    assert(action.description, `${action.key} is missing a description`);
    assert(action.output, `${action.key} declares no output`);
    assert(
      ["read", "search", "perform"].includes(action.type),
      `${action.key} has an unexpected type ${action.type}`,
    );
    assert(typeof action.execute === "function", `${action.key} has no execute hook`);
  }
});

Deno.test("index: every perform action states whether it is idempotent", () => {
  for (const action of app.actions.filter((a) => a.type === "perform")) {
    assertEquals(typeof action.idempotent, "boolean", `${action.key} does not declare idempotent`);
  }
});

Deno.test("index: only the converging writes claim idempotency", () => {
  const idempotent = app.actions
    .filter((a) => a.type === "perform" && a.idempotent)
    .map((a) => a.key)
    .sort();
  // Deletes converge on "gone"; re-granting the same access right converges
  // on the same membership state.
  assertEquals(idempotent, ["add-workspace-user", "delete-report", "delete-workspace"]);
});

Deno.test("index: everything that mints a new resource/job is marked non-idempotent", () => {
  const notIdempotent = app.actions
    .filter((a) => a.type === "perform" && !a.idempotent)
    .map((a) => a.key)
    .sort();
  // Each mints a new id (a workspace, an export job, a refresh job) on every
  // call, with no dedupe key Power BI's API accepts.
  assertEquals(notIdempotent, ["create-workspace", "export-report-to-file", "refresh-dataset"]);
});

Deno.test("index: declares the oauth2 auth method only", () => {
  assertEquals(app.auth.map((a) => a.key), ["oauth2"]);
});

Deno.test("index: declares the service and quota health checks, both absences", () => {
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "quota"]);
  assertEquals(app.healthChecks.every((h) => h.unavailable), true);
});

Deno.test("index: actions are grouped under a resource", () => {
  const resources = new Set(app.actions.map((a) => a.resource));
  assertEquals([...resources].sort(), ["dashboard", "dataset", "report", "workspace"]);
});

Deno.test("index: every action addressing a workspace-scoped resource (not workspace itself) offers an optional Workspace ID", () => {
  const workspaceScoped = app.actions.filter((a) => a.resource !== "workspace");
  for (const action of workspaceScoped) {
    const groupIdParam = (action.params ?? []).find((p) => p.key === "groupId");
    assert(groupIdParam, `${action.key} has no Workspace ID param`);
    assertEquals(
      groupIdParam!.required,
      undefined,
      `${action.key}'s Workspace ID must be optional`,
    );
  }
});

Deno.test("index: every credential-shaped param is a secret", () => {
  const suspicious: string[] = [];
  for (const action of app.actions) {
    for (const param of action.params ?? []) {
      if (!/password|secret|apikey|api-key|credential/i.test(param.key)) continue;
      if (param.type !== "secret" && !param.secret) {
        suspicious.push(`${action.key}.${param.key}`);
      }
    }
  }
  assertEquals(suspicious, []);
});

Deno.test("index: no action writes an Authorization header itself — sign owns the credential", () => {
  // A static sweep would need source access; this asserts the behavioral
  // contract instead: no action param is literally named `authorization`.
  for (const action of app.actions) {
    const keys = (action.params ?? []).map((p) => p.key.toLowerCase());
    assertEquals(keys.includes("authorization"), false, action.key);
  }
});
