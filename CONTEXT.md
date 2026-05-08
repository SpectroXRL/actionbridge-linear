# Domain Glossary

## Batch Review

The human-in-the-loop step between AI extraction and Linear issue creation. The client receives the full set of extracted issues, presents them to the user for approval or rejection, and only submits approved issues to Linear.

## Extracted Issues

The structured issue data produced by the AI service from a meeting transcript. Not yet created in Linear. Held client-side during the Batch Review step.

## Approved Issues

A subset of Extracted Issues that the user has explicitly accepted during Batch Review. These are submitted to Linear exactly as displayed.

## Rejected Issues

Extracted Issues that the user declined during Batch Review. Never sent to Linear.

## LinearIssue

The canonical content shape for a single issue: `title`, `description`, `stateId`, `labelIds`. Does not include routing/context fields (`teamId`, `projectId`). The authoritative definition is `linearIssueBaseSchema` (Zod) on the backend; the frontend mirrors it as a TypeScript interface.
_Avoid_: using LinearIssue to carry teamId or projectId — those belong on the request envelope only.

## Issue Submit Envelope

The full body POSTed to `POST /linear/issues`: `{ issues: LinearIssue[], teamId: string, projectId: string }`. `teamId` and `projectId` are routing fields, never part of the issue content.

## Extract Meta

Client-side merge of two things: the server's lookup tables (`states: [{id,name}]`, `labels: [{id,name}]`) and the form's routing fields (`teamId`, `projectId`). The server never echoes `teamId`/`projectId` back — the client re-attaches them from the original form submission.
_Avoid_: calling this "the server's metadata" — the routing fields are purely client-side.

---

## Architectural Decisions (summary)

- **Batch Review state is client-side.** The server is stateless with respect to pending issue batches. The API returns Extracted Issues as JSON; the client owns them during review; the client POSTs only Approved Issues back to the server for creation.
- **API split: `POST /linear/extract` and `POST /linear/issues`.** The original `/transcript` endpoint is retired. `/extract` accepts the transcript file + teamId + projectId and returns Extracted Issues as JSON. `/issues` accepts the Approved Issues array + teamId + projectId and calls `createIssueBatch`, returning 204.
- **`POST /linear/issues` re-validates with Zod.** The incoming issue objects are parsed against the existing `LinearIssue` schema before the Linear SDK is called. Malformed payloads return 400 with a structured error.
- **Batch Review is a conditional render within `LinearIndex`.** The component cycles through form → review → done states. No separate route or global store is introduced.
- **Individual rejection via checkbox, default approved.** Each Extracted Issue is checked by default. The user unchecks to reject. "Approve All" submits all currently checked issues.
- **Done state: success message + "Start over" button.** After successful creation, a confirmation showing the count of created issues is displayed. The user returns to the form via an explicit button. (Showing created issue links is a future enhancement.)
- **Cancel is an explicit button; zero-approval is a client-side validation error.** A "Cancel" button on the review screen returns the user to the form without any Linear API call. Submitting with zero issues checked is blocked client-side with an inline message — the server never receives an empty batch.
- **`/extract` response bundles a metadata lookup map.** The response shape is `{ issues: [...], meta: { states: [{id, name}], labels: [{id, name}] } }`. The client resolves stateId and labelIds to human-readable names using this map. The data is already available during extraction with no extra round trip.
- **Priority and estimate are out of scope.** The review displays title, description, state name, and label names only. Priority and estimate are not in the `LinearIssue` schema and are not submitted to Linear in this iteration.
- **Component state machine: form → extracting → review → submitting → done.** While extracting, the form is disabled and the submit button label changes to "Analysing…". Errors from either `/extract` or `/issues` are shown as an inline message in the current view; the user stays in context and can retry. A single `error: string | null` field in state covers both cases.
- **`LinearIssue` is mirrored on the frontend, not shared via a package.** The backend's `linearIssueBaseSchema` (Zod) is the authoritative definition. The frontend maintains a matching TypeScript interface with a compile-time assignability test to catch drift. See [ADR-0001](docs/adr/0001-linear-issue-type-sharing.md).
