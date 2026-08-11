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
  // Each of these describes an end state and replays onto the same one:
  // a PUT's documented conflict behaviour is `replace`; createLink returns the
  // existing link with a 200; the rest set a property or remove a thing.
  assertEquals(idempotent, [
    "create-link",
    "delete-item",
    "delete-permission",
    "move-item",
    "rename-item",
    "upload-file",
  ]);
});

Deno.test("index: everything that mints or notifies is marked non-idempotent", () => {
  const notIdempotent = app.actions
    .filter((a) => a.type === "perform" && !a.idempotent)
    .map((a) => a.key)
    .sort();
  // create-folder with `rename` makes a second folder, copy enqueues a second
  // copy, and an invite emails everyone again. Graph offers no dedupe key.
  assertEquals(notIdempotent, ["copy-item", "create-folder", "send-sharing-invite"]);
});

Deno.test("index: declares the oauth2 auth method only", () => {
  assertEquals(app.auth.map((a) => a.key), ["oauth2"]);
});

Deno.test("index: declares the service, quota and request-rate health checks", () => {
  assertEquals(app.healthChecks.map((h) => h.key), ["service", "quota", "request-rate"]);
});

Deno.test("index: every health check answers a different question", () => {
  // "is the vendor up" / "is there room" / "is there rate headroom", plus the
  // derived auth:oauth2 for "is this credential live".
  assertEquals(app.healthChecks.map((h) => h.kind), ["service", "quota", "quota"]);
  assertEquals(
    app.healthChecks.filter((h) => h.unavailable).map((h) => h.key),
    ["service", "request-rate"],
  );
});

Deno.test("index: actions are grouped under a resource", () => {
  const resources = new Set(app.actions.map((a) => a.resource));
  assertEquals([...resources].sort(), ["drive", "item", "permission"]);
});

Deno.test("index: the item-addressed and drive-addressed actions partition the App", () => {
  // Derived from the declared params rather than hand-listed, so an action that
  // loses an addressing form fails here rather than quietly shipping.
  const paramKeys = (key: string) =>
    (app.actions.find((a) => a.key === key)!.params ?? []).map((p) => p.key);
  const withItem = app.actions
    .filter((a) => paramKeys(a.key).includes("itemId"))
    .map((a) => a.key).sort();
  const withoutItem = app.actions
    .filter((a) => !paramKeys(a.key).includes("itemId"))
    .map((a) => a.key).sort();

  // Everything addressing a driveItem. `search` and `delta` are NOT here: the
  // reference hangs both off the drive root, not off an item.
  assertEquals(withItem, [
    "copy-item",
    "create-folder",
    "create-link",
    "delete-item",
    "delete-permission",
    "get-download-url",
    "get-item",
    "list-children",
    "list-permissions",
    "move-item",
    "rename-item",
    "send-sharing-invite",
    "upload-file",
  ]);
  assertEquals(withoutItem, [
    "get-drive",
    "list-changes",
    "list-drives",
    "list-shared-with-me",
    "search-items",
  ]);

  // Both forms always travel together.
  for (const key of withItem) {
    assert(paramKeys(key).includes("itemPath"), `${key} cannot be addressed by path`);
  }
});

Deno.test("index: every action that can reach another drive takes a drive id", () => {
  // The two exceptions are structural, not oversights: `/me/drives` IS the
  // drive-discovery call, and sharedWithMe is `/me`-only in v1.0, so offering a
  // drive id on either would be a lie.
  const withoutDriveId = app.actions
    .filter((a) => !(a.params ?? []).some((p) => p.key === "driveId"))
    .map((a) => a.key).sort();
  assertEquals(withoutDriveId, ["list-drives", "list-shared-with-me"]);
});

Deno.test("index: no action declares a $filter param — no endpoint here supports one", () => {
  // children, search and delta each enumerate their query options, and $filter
  // is on none of them.
  for (const action of app.actions) {
    const keys = (action.params ?? []).map((p) => p.key);
    assertEquals(keys.includes("filter"), false, `${action.key} offers a filter`);
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
  // And the one real case is genuinely covered, so the scan above is not
  // passing by finding nothing to look at.
  const password = app.actions
    .find((a) => a.key === "create-link")!
    .params!.find((p) => p.key === "password");
  assertEquals(password?.type, "secret");
});

Deno.test("index: the only param named `token` is a delta cursor, not a credential", () => {
  // Deliberately outside the scan above. `list-changes.token` is the delta
  // function's own parameter — it rides in the query string, is echoed back by
  // Graph inside `@odata.deltaLink`, and grants nothing without a live
  // credential. Masking it would hide a value users must be able to copy.
  const tokens = app.actions.flatMap((a) =>
    (a.params ?? []).filter((p) => /^token$/i.test(p.key)).map((p) => `${a.key}.${p.key}`)
  );
  assertEquals(tokens, ["list-changes.token"]);
  const param = app.actions
    .find((a) => a.key === "list-changes")!
    .params!.find((p) => p.key === "token")!;
  assert((param.hint ?? "").includes("function parameter"), param.hint);
});
