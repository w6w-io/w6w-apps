import { assert, assertEquals, assertRejects } from "@std/assert";
import contactList from "../../actions/contact-list.ts";
import contactGet from "../../actions/contact-get.ts";
import contactCreate from "../../actions/contact-create.ts";
import contactUpdate from "../../actions/contact-update.ts";
import contactDelete from "../../actions/contact-delete.ts";
import contactTagsAdd from "../../actions/contact-tags-add.ts";
import campaignList from "../../actions/campaign-list.ts";
import campaignContacts from "../../actions/campaign-contacts.ts";
import tagList from "../../actions/tag-list.ts";
import tagCreate from "../../actions/tag-create.ts";
import customFieldList from "../../actions/custom-field-list.ts";
import fromFieldList from "../../actions/from-field-list.ts";
import newsletterList from "../../actions/newsletter-list.ts";
import newsletterCreate from "../../actions/newsletter-create.ts";
import { errorBody, mockGetResponseCtx } from "../_helpers.ts";

Deno.test("contact-list: flattens its filters into bracketed parameters", async () => {
  const { ctx, calls } = mockGetResponseCtx([{ body: [] }]);
  await contactList.execute({
    email: "ada@example.com",
    campaignId: "camp1",
    createdFrom: "2026-01-01T00:00:00+00:00",
    sortBy: "createdOn",
    sortDirection: "DESC",
    fields: "contactId,email",
    perPage: 500,
  }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/contacts");
  assertEquals(url.searchParams.get("query[email]"), "ada@example.com");
  assertEquals(url.searchParams.get("query[campaignId]"), "camp1");
  assertEquals(url.searchParams.get("query[createdOn][from]"), "2026-01-01T00:00:00+00:00");
  assertEquals(url.searchParams.get("sort[createdOn]"), "DESC");
  assertEquals(url.searchParams.get("fields"), "contactId,email");
  assertEquals(url.searchParams.get("perPage"), "500");
});

/** A sort with no direction defaults to ascending rather than being dropped. */
Deno.test("contact-list: a sort field without a direction still sorts", async () => {
  const { ctx, calls } = mockGetResponseCtx([{ body: [] }]);
  await contactList.execute({ sortBy: "email" }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("sort[email]"), "ASC");
});

Deno.test("contact-get: builds the contact path", async () => {
  const { ctx, calls } = mockGetResponseCtx([{ body: { contactId: "c1" } }]);
  await contactGet.execute({ contactId: "c1" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v3/contacts/c1");
});

/**
 * The load-bearing shape: `campaign` is an OBJECT with `campaignId`, not a bare
 * string. Sending the id alone is a validation error.
 */
Deno.test("contact-create: wraps the campaign id in the object the API requires", async () => {
  const { ctx, calls } = mockGetResponseCtx([{ status: 202, body: {} }]);
  await contactCreate.execute({ email: "ada@example.com", campaignId: "camp1" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), {
    email: "ada@example.com",
    campaign: { campaignId: "camp1" },
  });
});

/** Tags are referenced by id, wrapped as `{tagId}` objects. */
Deno.test("contact-create: wraps tag ids as objects", async () => {
  const { ctx, calls } = mockGetResponseCtx([{ status: 202, body: {} }]);
  await contactCreate.execute(
    { email: "a@b.com", campaignId: "camp1", tags: "tag1, tag2" },
    ctx,
  );
  assertEquals(JSON.parse(calls[0].body!).tags, [{ tagId: "tag1" }, { tagId: "tag2" }]);
});

/** The add is queued: a 202 with no contact id is the documented success. */
Deno.test("contact-create: treats the queued 202 as success", async () => {
  const { ctx } = mockGetResponseCtx([{ status: 202, body: "" }]);
  assertEquals(
    await contactCreate.execute({ email: "a@b.com", campaignId: "camp1" }, ctx),
    undefined,
  );
  assertEquals(contactCreate.idempotent, false);
});

Deno.test("contact-create: a duplicate address surfaces as GetResponse's 409", async () => {
  const { ctx } = mockGetResponseCtx([
    { status: 409, body: { code: 1008, message: "Contact already exists" } },
  ]);
  await assertRejects(
    async () => {
      await contactCreate.execute({ email: "a@b.com", campaignId: "camp1" }, ctx);
    },
    Error,
    "Contact already exists",
  );
});

/** Update is a POST, not a PUT or PATCH — the id in the path is what marks it. */
Deno.test("contact-update: POSTs to the contact path with only the changed fields", async () => {
  const { ctx, calls } = mockGetResponseCtx([{ body: { contactId: "c1" } }]);
  await contactUpdate.execute({ contactId: "c1", name: "Ada L" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(new URL(calls[0].url).pathname, "/v3/contacts/c1");
  assertEquals(JSON.parse(calls[0].body!), { name: "Ada L" });
});

Deno.test("contact-update: moving campaigns sends the wrapped object", async () => {
  const { ctx, calls } = mockGetResponseCtx([{ body: {} }]);
  await contactUpdate.execute({ contactId: "c1", campaignId: "camp2" }, ctx);
  assertEquals(JSON.parse(calls[0].body!), { campaign: { campaignId: "camp2" } });
});

Deno.test("contact-delete: DELETEs with the optional provenance parameters", async () => {
  const { ctx, calls } = mockGetResponseCtx([{ status: 204 }]);
  await contactDelete.execute({ contactId: "c1", messageId: "m1", ipAddress: "1.2.3.4" }, ctx);
  assertEquals(calls[0].method, "DELETE");
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/contacts/c1");
  assertEquals(url.searchParams.get("messageId"), "m1");
  assertEquals(url.searchParams.get("ipAddress"), "1.2.3.4");
});

Deno.test("contact-tags-add: wraps each id and refuses an empty list", async () => {
  const { ctx, calls } = mockGetResponseCtx([{ body: {} }]);
  await contactTagsAdd.execute({ contactId: "c1", tagIds: "t1,t2" }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v3/contacts/c1/tags");
  assertEquals(JSON.parse(calls[0].body!), { tags: [{ tagId: "t1" }, { tagId: "t2" }] });

  const empty = mockGetResponseCtx([]);
  await assertRejects(
    async () => {
      await contactTagsAdd.execute({ contactId: "c1", tagIds: " , " }, empty.ctx);
    },
    Error,
    "empty",
  );
  assertEquals(empty.calls.length, 0);
});

/** The API takes isDefault as a string flag, not a JSON boolean. */
Deno.test("campaign-list: sends isDefault as a string flag", async () => {
  const { ctx, calls } = mockGetResponseCtx([{ body: [] }, { body: [] }]);
  await campaignList.execute({ isDefault: true }, ctx);
  assertEquals(new URL(calls[0].url).searchParams.get("query[isDefault]"), "true");
  await campaignList.execute({ isDefault: false }, ctx);
  assertEquals(new URL(calls[1].url).searchParams.get("query[isDefault]"), "false");
});

Deno.test("campaign-contacts: scopes the contact search to one campaign", async () => {
  const { ctx, calls } = mockGetResponseCtx([{ body: [] }]);
  await campaignContacts.execute(
    { campaignId: "camp1", createdFrom: "2026-08-01T00:00:00+00:00" },
    ctx,
  );
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/campaigns/camp1/contacts");
  assertEquals(url.searchParams.get("query[createdOn][from]"), "2026-08-01T00:00:00+00:00");
});

Deno.test("tag-list: filters and sorts by name", async () => {
  const { ctx, calls } = mockGetResponseCtx([{ body: [] }]);
  await tagList.execute({ name: "vip", sortDirection: "DESC" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/tags");
  assertEquals(url.searchParams.get("query[name]"), "vip");
  assertEquals(url.searchParams.get("sort[name]"), "DESC");
});

Deno.test("tag-create: posts the name and is not idempotent", async () => {
  const { ctx, calls } = mockGetResponseCtx([{ status: 201, body: { tagId: "t1" } }]);
  await tagCreate.execute({ name: "vip_customers" }, ctx);
  assertEquals(calls[0].method, "POST");
  assertEquals(JSON.parse(calls[0].body!), { name: "vip_customers" });
  assertEquals(tagCreate.idempotent, false);
});

/** GetResponse rejects spaces and punctuation in tag names rather than normalising. */
Deno.test("tag-create: declares the vendor's name pattern on the param", () => {
  const name = tagCreate.params!.find((p) => p.key === "name")!;
  assertEquals(name.validation?.pattern, "^[A-Za-z0-9_-]+$");
});

Deno.test("custom-field-list and from-field-list: plain paged lookups", async () => {
  const { ctx, calls } = mockGetResponseCtx([{ body: [] }, { body: [] }]);
  await customFieldList.execute({ perPage: 50 }, ctx);
  assertEquals(new URL(calls[0].url).pathname, "/v3/custom-fields");
  assertEquals(new URL(calls[0].url).searchParams.get("perPage"), "50");
  await fromFieldList.execute({}, ctx);
  assertEquals(new URL(calls[1].url).pathname, "/v3/from-fields");
});

Deno.test("newsletter-list: filters by status and date", async () => {
  const { ctx, calls } = mockGetResponseCtx([{ body: [] }]);
  await newsletterList.execute({ status: "sent", createdFrom: "2026-01-01T00:00:00+00:00" }, ctx);
  const url = new URL(calls[0].url);
  assertEquals(url.pathname, "/v3/newsletters");
  assertEquals(url.searchParams.get("query[status]"), "sent");
  assertEquals(url.searchParams.get("query[createdOn][from]"), "2026-01-01T00:00:00+00:00");
});

/**
 * The owning campaign and the audience are separate fields in the API. Defaulting
 * the second from the first keeps the common case to one input while leaving the
 * uncommon one expressible.
 */
Deno.test("newsletter-create: defaults the audience to the owning campaign", async () => {
  const { ctx, calls } = mockGetResponseCtx([{ status: 201, body: { newsletterId: "n1" } }]);
  await newsletterCreate.execute({
    subject: "August update",
    fromFieldId: "ff1",
    campaignId: "camp1",
    html: "<p>hi</p>",
  }, ctx);
  const body = JSON.parse(calls[0].body!);
  assertEquals(body.campaign, { campaignId: "camp1" });
  assertEquals(body.sendSettings.selectedCampaigns, ["camp1"]);
  assertEquals(body.fromField, { fromFieldId: "ff1" });
  assertEquals(body.content, { html: "<p>hi</p>" });
  assertEquals(body.name, "August update", "the internal name defaults to the subject");
  assertEquals(body.editor, "custom");
});

Deno.test("newsletter-create: a different audience overrides the default", async () => {
  const { ctx, calls } = mockGetResponseCtx([{ status: 201, body: {} }]);
  await newsletterCreate.execute({
    subject: "s",
    fromFieldId: "ff1",
    campaignId: "camp1",
    plain: "hi",
    sendToCampaignIds: "camp2, camp3",
  }, ctx);
  assertEquals(JSON.parse(calls[0].body!).sendSettings.selectedCampaigns, ["camp2", "camp3"]);
});

/** A newsletter with no content is a 400; catching it here says which field. */
Deno.test("newsletter-create: refuses to send with no content", async () => {
  const { ctx, calls } = mockGetResponseCtx([]);
  await assertRejects(
    async () => {
      await newsletterCreate.execute({ subject: "s", fromFieldId: "ff1", campaignId: "c1" }, ctx);
    },
    Error,
    "needs content",
  );
  assertEquals(calls.length, 0, "nothing should have been sent");
});

/** It sends real email to real people; the runtime must never retry it. */
Deno.test("newsletter-create: is not idempotent", () => {
  assertEquals(newsletterCreate.idempotent, false);
});

Deno.test("actions: throttling surfaces GetResponse's 1015 rather than a generic error", async () => {
  const { ctx } = mockGetResponseCtx([
    { status: 429, body: errorBody(1015, "You have reached your requests limit") },
  ]);
  const err = await assertRejects(async () => {
    await contactList.execute({}, ctx);
  }, Error);
  assert(err.message.includes("code 1015"), err.message);
});
