import type { ActionDefinition } from "@w6w/types";
import { compact, GivebutterClient, type PageEnvelope } from "../lib/client.ts";
import { contactTypeOptions, paginationParams, paginationQuery } from "../lib/params.ts";

const sortOptions = [
  { value: "name_or_company", label: "Name or company" },
  { value: "primary_email", label: "Primary email" },
  { value: "point_of_contact", label: "Point of contact" },
  { value: "created_at", label: "Created at" },
  { value: "total_contributions", label: "Total contributions" },
  { value: "recurring_contributions", label: "Recurring contributions" },
  { value: "last_donation_amount", label: "Last donation amount" },
];

interface Input {
  type?: string;
  createdAfter?: string;
  createdBefore?: string;
  updatedAfter?: string;
  updatedBefore?: string;
  totalContributionsMin?: number;
  totalContributionsMax?: number;
  recurringContributionsMin?: number;
  recurringContributionsMax?: number;
  tags?: string;
  sortBy?: string;
  sortByDesc?: string;
  email?: string;
  primaryEmail?: string;
  firstName?: string;
  lastName?: string;
  page?: number;
  per_page?: number;
}

const contactList: ActionDefinition<Input> = {
  key: "contact-list",
  type: "read",
  resource: "contact",
  title: "List Contacts",
  description: "List and filter contacts (the donor CRM) on the connected account.",
  params: [
    { key: "type", label: "Type", type: "select", options: contactTypeOptions },
    { key: "createdAfter", label: "Created after", type: "datetime" },
    { key: "createdBefore", label: "Created before", type: "datetime" },
    { key: "updatedAfter", label: "Updated after", type: "datetime" },
    { key: "updatedBefore", label: "Updated before", type: "datetime" },
    { key: "totalContributionsMin", label: "Total contributions ≥", type: "number" },
    { key: "totalContributionsMax", label: "Total contributions ≤", type: "number" },
    { key: "recurringContributionsMin", label: "Recurring contributions ≥", type: "number" },
    { key: "recurringContributionsMax", label: "Recurring contributions ≤", type: "number" },
    { key: "tags", label: "Tags", type: "string", hint: "Comma-separated tag names." },
    { key: "sortBy", label: "Sort by", type: "select", options: sortOptions },
    { key: "sortByDesc", label: "Sort by (descending)", type: "select", options: sortOptions },
    { key: "email", label: "Any email equals", type: "string" },
    { key: "primaryEmail", label: "Primary email equals", type: "string" },
    { key: "firstName", label: "First name", type: "string" },
    { key: "lastName", label: "Last name", type: "string" },
    ...paginationParams(),
  ],
  output: [
    { key: "data", type: "array", label: "Contacts" },
    { key: "meta", type: "object", label: "Pagination metadata" },
  ],

  async execute(input, ctx) {
    const query = compact({
      type: input.type,
      createdAfter: input.createdAfter,
      createdBefore: input.createdBefore,
      updatedAfter: input.updatedAfter,
      updatedBefore: input.updatedBefore,
      totalContributionsMin: input.totalContributionsMin,
      totalContributionsMax: input.totalContributionsMax,
      recurringContributionsMin: input.recurringContributionsMin,
      recurringContributionsMax: input.recurringContributionsMax,
      tags: input.tags,
      sortBy: input.sortBy,
      sortByDesc: input.sortByDesc,
      email: input.email,
      primaryEmail: input.primaryEmail,
      firstName: input.firstName,
      lastName: input.lastName,
      ...paginationQuery(input),
    });
    return await new GivebutterClient(ctx).page("/contacts", { query }) as PageEnvelope<unknown>;
  },
};

export default contactList;
