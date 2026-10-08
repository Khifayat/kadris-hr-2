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

## Viewport behavior

On desktop and tablet layouts, the dashboard is a viewport-bound workspace. The page header, alert banner when present, and summary cards remain visible without a page-level vertical scrollbar. Recent employees and reminder items scroll inside their respective panels when their content exceeds the available panel height. On small screens, the dashboard returns to normal document scrolling so cards and touch controls remain usable.

## Access

Dashboard is part of the HR workspace and is visible to HR read roles.

## Navigation

Dashboard links users into employee lists, employee profiles, reminders, and compliance queues.
