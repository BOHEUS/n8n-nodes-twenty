# n8n-nodes-twenty

An [n8n](https://n8n.io) community node for [Twenty](https://twenty.com) CRM.

Every Twenty workspace has its own data model: custom objects, custom fields, and
changes to the standard ones. So this node does not hardcode any objects or fields.
It reads your workspace's schema from Twenty's metadata API, which means custom objects
and new fields show up in n8n without any update to the node.

## Operations

Pick an **Object** (loaded from your workspace), then an operation:

| Operation        | Notes                                                                                              |
| ---------------- | -------------------------------------------------------------------------------------------------- |
| Create           | Fill in fields with the field mapper, or auto-map them from the incoming item                      |
| Create Many      | Creates one record per input item, in batches of 200                                               |
| Create or Update | Upsert. Matches on the record ID, or on the object's unique fields (for example a person's email)  |
| Get              | By record ID. Optionally pick the fields to return and include related records                     |
| Get Many         | Return All or a Limit, with filter, sort order, field selection, related records and trash options |
| Update           | By record ID, using the field mapper                                                               |
| Update Many      | Updates every record that matches a filter                                                         |
| Delete           | By record ID. Moves the record to the trash, or deletes it for good with **Delete Permanently**    |
| Delete Many      | Deletes every record that matches a filter, with the same permanent option                         |
| Restore          | Brings a record back from the trash                                                                |
| Find Duplicates  | Finds existing records that look like the given field values                                       |
| Merge            | Merges two or more records into one, with a dry run to preview the result                          |
| Group            | Counts or totals records, grouped by fields (and date parts such as month)                         |
| Custom API Call  | Sends any request to your Twenty server with your credentials, for endpoints not covered above     |

Update Many and Delete Many refuse an empty filter, so they cannot touch every record by accident.

The node can be used as a tool by an AI agent. That includes Custom API Call, which lets the agent
send any request your API key allows, including changes to the workspace schema. Give the
credential an API key with only the permissions the agent needs.

### The field mapper

Create and Update list the fields of the selected object, with their types and required
flags. Things worth knowing:

- Select and rating fields are dropdowns with the workspace's options.
- Multi-select fields take a JSON array, e.g. `["PLAYFUL", "SHY"]`. n8n's field mapper has no
  multi-select input, so the label lists the allowed values in that form (the first 10 of them).
- Composite fields (name, emails, phones, links, address, currency) take JSON, e.g.
  `{"firstName": "Ada", "lastName": "Lovelace"}`.
- Relations to another record (many-to-one) are set by that record's ID, e.g. `Company (ID)`.
- Fields that Twenty manages (system fields, read-only fields, inverse relations) are not offered.
- A field is marked required only when creating records, and only if it is not nullable and has no
  default value. Update, Create or Update and Find Duplicates send just the fields you fill in.

### Filters, sorting and the trash

Get Many accepts Twenty's filter syntax, for example:

```
name.firstName[eq]:"Ada"
and(jobTitle[eq]:"CEO",createdAt[gte]:"2026-01-01")
```

Under **Options** you can also set:

- **Order By**: comma-separated fields with an optional direction, for example
  `createdAt[DescNullsLast],name`.
- **Fields**: comma-separated fields to return, for example `id,name`. Leave empty for all.
- **Related Records**: also return the records linked through relation fields.
- **Deleted Records**: exclude (default), include or return only records in the trash. This is how
  you find a record to Restore, or to delete permanently.

### Deleting

Delete and Delete Many move records to the trash. Turn on **Delete Permanently** to remove them
for good, including records that are already in the trash.

## Twenty Trigger

The **Twenty Trigger** node starts a workflow when records change. Pick an object (or all
objects) and one or more events: created, updated, deleted (moved to the trash), destroyed
(deleted for good) or restored.

When the workflow is activated the node registers a webhook in your Twenty workspace, and it
removes it again when the workflow is deactivated. Deliveries are signed by Twenty; the node
checks the signature and rejects anything unsigned, tampered with or older than five minutes.

Twenty must be able to reach your n8n instance, so n8n needs a public URL (`WEBHOOK_URL`). A
self-hosted Twenty also blocks webhooks to private addresses such as `localhost` by default. To
test locally, add the hostname to Twenty's `OUTBOUND_HTTP_ALLOWED_INTERNAL_HOSTS` setting.

## Credentials

Create an API key in Twenty under **Settings → APIs & Webhooks**, then add a **Twenty API**
credential in n8n:

- **API Key**: the key you created.
- **Base URL**: `https://api.twenty.com` for Twenty Cloud, or the URL of your self-hosted
  server (for example `http://localhost:3000`).

The key needs access to the metadata API as well as to the records you work with, because the
node uses the metadata API to build the object list and field mapper. Twenty enforces field-level
permissions, so a write to a field the key's role cannot write fails with Twenty's own message.

## Development

```bash
npm ci
npm run dev      # starts n8n with the node loaded and hot reload
npm run build
npm run lint
npm test
```

Requires Node.js 22 or newer. To try the node against a local Twenty, add a credential with
Base URL `http://localhost:3000`.

The code lives in [`nodes/Twenty/`](nodes/Twenty/):

- `loadOptions/`: the Object dropdown
- `resourceMapping/`: turns an object's field metadata into the field mapper
- `shared/`: API requests and pagination, metadata types, and the query and body builders
- `__tests__/`: unit tests, run with `npm test` (not part of the published package)

The trigger lives in [`nodes/TwentyTrigger/`](nodes/TwentyTrigger/).

## Twenty versions

The node talks to Twenty's REST API and adapts to differences between servers where it can: for
example, current servers return metadata lists as a plain array, while older ones nest them
under a key. Newer operations such as Merge, Find Duplicates and Group depend on your server's
version. If your server does not support one, the node shows Twenty's own error message.

## Limitations

- Fields of type files, actor, position and morph relations are not writable from the node.
- Dedicated operations for creating objects and fields are not included. Use **Custom API Call**
  with `/rest/metadata/objects` and `/rest/metadata/fields` for those.
- The operation list is flat rather than grouped by resource, because Twenty's objects are the
  resource. n8n's linter suggests resources when there are more than five operations.

## License

[MIT](LICENSE.md)
