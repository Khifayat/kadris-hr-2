# Employee Self-Service Specification

## Goal

Allow linked employees to view and submit their own compliance requirements without HR handling every upload.

## Implemented files

- `app/(protected)/my-requirements/page.tsx`
- `app/(protected)/my-requirements/actions.ts`
- `lib/portal/queries.ts`

## Access model

A user must be authenticated and linked to an `Employee` through `User.employeeId` to see their own checklist.

If the user is not linked to an employee profile, the page displays an empty state instructing them to contact HR. User-facing assignment language uses **tasks**; underlying compatibility names may still use `requirement`.

## Capabilities

Employees can:

- view current clearance state;
- view applicable requirements;
- see existing submitted documents;
- upload evidence for requirements that are missing, rejected, expired, or otherwise submit-eligible.

## Restrictions

Employees can only submit documents for their own linked employee record. The server action validates the employee ID against the current user.

Submissions go to `PENDING_REVIEW`; employees cannot self-approve requirements.
