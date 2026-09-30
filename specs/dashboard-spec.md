# Dashboard Specification

## Goal

Give HR/admins an at-a-glance view of employee status and urgent compliance work.

## Implemented files

- `app/(protected)/dashboard/page.tsx`
- `lib/employees/queries.ts`
- `lib/reminders/queries.ts`

## Dashboard content

The dashboard displays:

- active employee count;
- onboarding employee count;
- not-cleared employee count;
- open reminder count;
- not-cleared attention banner;
- recent employees;
- top reminder queue items;
- pending review, expired, and expiring-soon summary counts.

## Access

Dashboard is part of the HR workspace and is visible to HR read roles.

## Navigation

Dashboard links users into employee lists, employee profiles, reminders, and compliance queues.
