# n8n-nodes-twenty

An [n8n](https://n8n.io) community node for [Twenty](https://twenty.com) CRM.

Every Twenty workspace has its own data model: custom objects, custom fields, and
changes to the standard ones. So this node does not hardcode any objects or fields.
It reads your workspace's schema from Twenty's metadata API, which means custom objects
and new fields show up in n8n without any update to the node.

## Operations

Pick an **Object** (loaded from your workspace), then an operation:

| Operation | Notes                                                                         |
| --------- | ----------------------------------------------------------------------------- |
| Create    | Fill in fields with the field mapper, or auto-map them from the incoming item |
| Get       | By record ID                                                                  |
| Get Many  | Return All or a Limit, plus an optional Twenty `filter` expression            |
| Update    | By record ID, using the field mapper                                          |
| Delete    | By record ID (Twenty soft-deletes)                                            |

### The field mapper

Create and Update list the fields of the selected object, with their types and required
flags. Things worth knowing:

- Select and rating fields are dropdowns with the workspace's options.
- Composite fields (name, emails, phones, links, address, currency) take JSON, e.g.
  `{"firstName": "Ada", "lastName": "Lovelace"}`.
- Relations to another record (many-to-one) are set by that record's ID, e.g. `Company (ID)`.
- Fields that Twenty manages (system fields, read-only fields, inverse relations) are not offered.
- A field is marked required only if it is not nullable and has no default value.

### Filters

Get Many accepts Twenty's filter syntax, for example:

```
name.firstName[eq]:"Ada"
and(jobTitle[eq]:"CEO",createdAt[gte]:"2026-01-01")
```

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
```

Requires Node.js 22 or newer. To try the node against a local Twenty, add a credential with
Base URL `http://localhost:3000`.

The code lives in [`nodes/Twenty/`](nodes/Twenty/):

- `loadOptions/`: the Object dropdown
- `resourceMapping/`: turns an object's field metadata into the field mapper
- `shared/`: API requests and pagination, metadata types, and the request body builder

## Limitations

- No trigger node yet (Twenty webhooks).
- Fields of type files, actor, position and morph relations are not writable from the node.
- Upsert and batch operations are not implemented.

## License

[MIT](LICENSE.md)
