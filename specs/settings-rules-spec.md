# Settings and Rule Configuration Specification

## Goal

Allow HR/admins to configure job roles, reusable requirements, and role-to-requirement rules that drive employee compliance assignments.

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

Roles are used when creating employees and assigning default requirements.

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
