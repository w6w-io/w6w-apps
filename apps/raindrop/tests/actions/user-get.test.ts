import { assert, assertEquals } from "@std/assert";
import userGet, { projectUser } from "../../actions/user-get.ts";
import { mockCtx, pathOf } from "../_helpers.ts";

/** The reference's own sample response for `GET /rest/v1/user`, verbatim. */
const SAMPLE_USER = {
  _id: 32,
  config: {
    broken_level: "strict",
    font_color: "",
    font_size: 0,
    lang: "ru_RU",
    last_collection: 8492393,
    raindrops_sort: "-lastUpdate",
    raindrops_view: "list",
  },
  dropbox: { enabled: true },
  email: "some@email.com",
  email_MD5: "13a0a20681d8781912e5314150694bf7",
  files: { used: 6766094, size: 10000000000, lastCheckPoint: "2020-01-26T23:53:19.676Z" },
  fullName: "Mussabekov Rustem",
  gdrive: { enabled: true },
  groups: [{ title: "My Collections", hidden: false, sort: 0, collections: [8364483, 66] }],
  password: true,
  pro: true,
  proExpire: "2028-09-27T22:00:00.000Z",
  registered: "2014-09-30T07:51:15.406Z",
};

Deno.test("user-get: reads /user and returns the projected account", async () => {
  const { ctx, calls } = mockCtx([{ body: { result: true, user: SAMPLE_USER } }]);
  const out = await userGet.execute({}, ctx) as { user: Record<string, unknown> };

  assertEquals(pathOf(calls[0].url), "/rest/v1/user");
  assertEquals(out.user._id, 32);
  assertEquals(out.user.fullName, "Mussabekov Rustem");
});

/**
 * The vendor warns on four separate pages that responses "could contain other
 * fields, not described above. It's unsafe to use them" — so anything Raindrop
 * adds to this endpoint must not be forwarded into a workflow's persisted
 * result. This is the assertion that keeps the projection honest: an undocumented
 * field is dropped even when it looks harmless.
 */
Deno.test("user-get: drops fields the reference does not document", () => {
  const projected = projectUser({
    ...SAMPLE_USER,
    apiToken: "should-never-be-forwarded",
    someNewField: 1,
  })!;

  assertEquals("apiToken" in projected, false);
  assertEquals("someNewField" in projected, false);
});

/**
 * `groups` is kept deliberately: it is the ONLY place root-collection order
 * lives, and the vendor's "Nested structure" page makes this call step 1 of 3
 * for rebuilding the sidebar.
 */
Deno.test("user-get: keeps groups, which holds root-collection order", () => {
  const projected = projectUser(SAMPLE_USER)!;
  assertEquals(projected.groups, SAMPLE_USER.groups);
});

/**
 * `password` is documented as a Boolean — "Does user have a password" — and this
 * pins that reading. If Raindrop ever made it a string, the projection would
 * forward it, so the assertion is on the type as well as the presence.
 */
Deno.test("user-get: the `password` field is the documented boolean, not a secret", () => {
  const projected = projectUser(SAMPLE_USER)!;
  assertEquals(typeof projected.password, "boolean");
  assertEquals(projected.password, true);
});

/** The six linked-account objects carry only `{enabled}`, so they collapse. */
Deno.test("user-get: linked social accounts collapse to booleans", () => {
  const projected = projectUser(SAMPLE_USER)!;
  assertEquals(projected.linkedAccounts, { dropbox: true, gdrive: true });
});

Deno.test("user-get: the config and files sub-objects are projected too", () => {
  const projected = projectUser({
    ...SAMPLE_USER,
    config: { ...SAMPLE_USER.config, secretSetting: "x" },
    files: { ...SAMPLE_USER.files, undocumented: 1 },
  })!;

  assertEquals("secretSetting" in (projected.config as Record<string, unknown>), false);
  assertEquals("undocumented" in (projected.files as Record<string, unknown>), false);
  assertEquals((projected.files as Record<string, unknown>).size, 10000000000);
});

Deno.test("user-get: a missing user object yields undefined rather than throwing", () => {
  assertEquals(projectUser(undefined), undefined);
  assertEquals(projectUser("not an object"), undefined);
  assertEquals(projectUser([{ _id: 1 }]), undefined);
});

Deno.test("user-get: takes no parameters", () => {
  assertEquals(userGet.params, []);
  assert(/documented fields only/i.test(userGet.description ?? ""), userGet.description);
});
