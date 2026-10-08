# Settings and Rule Configuration Specification

## Goal

Allow HR/admins to configure job roles, reusable requirements, and role-to-requirement rules that drive employee compliance assignments.

## Section navigation

Settings separates its independent administration areas into URL-based tabs: Job roles, Tasks, Users and Access for owner/admin users, and Role rules. The selected tab uses the `tab` query parameter. A selected job role remains identified by the existing `roleId` query parameter when viewing or editing its role rules. This prevents all configuration forms and record lists from being rendered as one long workspace.

On desktop, every Settings tab uses the same fixed-height content viewport below the page heading and tab navigation. Records scroll within that viewport; switching tabs must not change its height.

## Implemented files

- `app/(protected)/settings/page.tsx`
- `app/(protected)/settings/actions.ts`
- `lib/settings/schema.ts`
- `lib/settings/queries.ts`
- `lib/settings/service.ts`

## Job roles

A job role includes:

- name
- department
- optional description
- active status

Roles are used when creating employees and assigning default tasks. Each role row visibly labels its assigned task total (for example, `5 tasks`) so the count is not confused with its employee total.

Each Settings section keeps a sticky panel header that remains visible while its list scrolls. Its primary action appears as a concise right-side button: + New Role, + New Requirement, + New User, or + New Rule. Selecting the action opens its form below the action without moving the current list.

Open action forms close when the user clicks outside the form or presses Escape. Interacting inside the form does not close it.

## Requirement library

A requirement includes:

- name
- description
- type
- whether it expires
- optional expiration period
- whether HR approval is required
- reminder days
- active status

Requirement types:

- document
- background check
- certification
- training
- acknowledgement
- health screening
- other

## Role rules

`JobRoleRequirement` connects a role to a requirement and stores:

- required before work flag
- conditional flag
- optional condition key
- active status

When a role rule changes, the service syncs the rule to current employees in that role and refreshes clearance.

## Permissions

Settings page requires HR write role. Users & Access inside Settings requires owner/admin specifically.

## Audit logs

Settings actions emit audit records for role creation, requirement creation, role requirement assignment, and removal.
