import { assert, assertEquals } from "@std/assert";
import app from "../index.ts";

Deno.test("index: exposes every action with a unique kebab-case key", () => {
  const keys = app.actions.map((a) => a.key);
  assertEquals(keys.length, 16);
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
    assertEquals(
      typeof action.idempotent,
      "boolean",
      `${action.key} does not declare idempotent`,
    );
  }
});

Deno.test("index: only the converging writes claim idempotency", () => {
  const idempotent = app.actions
    .filter((a) => a.type === "perform" && a.idempotent)
    .map((a) => a.key)
    .sort();
  // A PATCH/PUT sets an end state, and Graph's documented PUT conflict
  // behaviour is `replace`; deletes converge on "gone" either way.
  assertEquals(idempotent, ["delete-item", "update-item", "upload-file"]);
});

Deno.test("index: everything that mints a new resource is marked non-idempotent", () => {
  const notIdempotent = app.actions
    .filter((a) => a.type === "perform" && !a.idempotent)
    .map((a) => a.key)
    .sort();
  // Each mints a new id on every call (create-list, create-item), or can mint
  // a second one on a replay (create-folder with `rename`), and Graph offers
  // no dedupe key for any of them.
  assertEquals(notIdempotent, ["create-folder", "create-item", "create-list"]);
});

Deno.test("index: declares the oauth2 auth method only", () => {
  assertEquals(app.auth.map((a) => a.key), ["oauth2"]);
});

Deno.test("index: declares the service, quota and request-rate health checks", () => {
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "quota", "request-rate"]);
});

Deno.test("index: every health check answers a different question", () => {
  assertEquals(app.healthChecks.map((h) => h.kind), ["service", "quota", "quota"]);
  assertEquals(
    app.healthChecks.filter((h) => h.unavailable).map((h) => h.key),
    ["service", "request-rate"],
  );
});

Deno.test("index: actions are grouped under a resource", () => {
  const resources = new Set(app.actions.map((a) => a.resource));
  assertEquals(
    [...resources].sort(),
    ["drive", "drive-item", "list", "list-item", "site"],
  );
});

Deno.test("index: a site resource offers no create/update/delete — the reference is read-only for sites", () => {
  const siteActions = app.actions.filter((a) => a.resource === "site");
  assertEquals(siteActions.every((a) => a.type === "read"), true);
});

Deno.test("index: no action declares a $filter param, except List Items — the only collection that documents one", () => {
  const withFilter = app.actions
    .filter((a) => (a.params ?? []).some((p) => p.key === "filter"))
    .map((a) => a.key);
  assertEquals(withFilter, ["list-items"]);
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

Deno.test("index: every drive-item action offers both an Item ID and an Item path", () => {
  // Not a bare "has an `itemId` param" scan: the list-item actions declare
  // their own unrelated `itemId` (the row's own id), so the check is scoped
  // to the driveItem-addressed resource group specifically.
  const driveItemActions = app.actions.filter((a) => a.resource === "drive-item").map((a) => a.key)
    .sort();
  assertEquals(driveItemActions, [
    "create-folder",
    "get-download-url",
    "list-children",
    "upload-file",
  ]);
  const paramKeys = (key: string) =>
    (app.actions.find((a) => a.key === key)!.params ?? []).map((p) => p.key);
  for (const key of driveItemActions) {
    assert(paramKeys(key).includes("itemId"), `${key} cannot be addressed by Item ID`);
    assert(paramKeys(key).includes("itemPath"), `${key} cannot be addressed by Item path`);
  }
});

Deno.test("index: every action that addresses a driveItem also offers a Drive ID override", () => {
  const driveItemActions = app.actions.filter((a) => a.resource === "drive-item");
  for (const action of driveItemActions) {
    const keys = (action.params ?? []).map((p) => p.key);
    assert(keys.includes("driveId"), `${action.key} cannot address another library`);
  }
});

Deno.test("index: every action offers site addressing, even a Drive-ID action — Drive ID only overrides it", () => {
  for (const action of app.actions) {
    const keys = (action.params ?? []).map((p) => p.key);
    assert(
      keys.includes("siteId") && keys.includes("hostname"),
      `${action.key} has no site addressing`,
    );
  }
});
