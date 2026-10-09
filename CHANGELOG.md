# Changelog

## Unreleased

### Added

- Operations: Create Many, Create or Update, Update Many, Delete Many, Restore, Find Duplicates,
  Merge, Group and Custom API Call.
- Delete Permanently option for Delete and Delete Many.
- Get Many options: Order By, Fields, Related Records and Deleted Records.
- Fields and Related Records options for Get.
- Twenty Trigger node that starts a workflow on record created, updated, deleted, destroyed and
  restored events, with signature verification.
- Unit tests, run in CI.

### Fixed

- Delete and Delete Many removed records permanently by default instead of moving them to the trash.
- The object dropdown and field mapper failed on servers that return metadata lists as an array.
- A new node started with an empty object, which the editor flagged as unsupported. It now
  starts on People.
