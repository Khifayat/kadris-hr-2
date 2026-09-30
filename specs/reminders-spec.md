# Reminders Specification

## Goal

Surface compliance work that needs attention for HR/admins and employees.

## Implemented files

- `app/(protected)/reminders/page.tsx`
- `lib/reminders/queries.ts`
- `lib/reminders/rules.ts`
- `lib/reminders/types.ts`

## Reminder categories

The reminder engine identifies items such as:

- missing required documents;
- documents pending HR review;
- rejected requirements;
- expired credentials;
- credentials expiring soon.

## Role behavior

HR workspace users see broader team reminders. Employees see reminders relevant to their linked employee profile.

## Priority

Reminder items are assigned priority to support queue ordering and visual urgency.

## Relationship to clearance

Reminder state is derived from employee requirements and supports operational follow-up. Clearance remains calculated by the compliance engine.
