# Employee Management Specification

## Goal

Maintain employee records and create compliance assignments from job role rules.

## Implemented files

- `app/(protected)/employees/page.tsx`
- `app/(protected)/employees/new/page.tsx`
- `app/(protected)/employees/new/actions.ts`
- `app/(protected)/employees/[id]/page.tsx`
- `app/(protected)/employees/[id]/actions.ts`
- `lib/employees/schema.ts`
- `lib/employees/service.ts`
- `lib/employees/queries.ts`

## Employee fields

Core employee fields:

- employee number
- first and last name
- email and optional phone
- job role
- supervisor
- hire date
- employment type
- employment status
- transports participants flag
- performs medication duties flag
- clearance status projection

## Directory

The directory supports employee listing and filtering/search through server-side query utilities.

## Create employee flow

1. HR/admin submits employee creation form.
2. Input is validated by schema.
3. Employee record is created.
4. Active role requirements are assigned to the employee.
5. Conditional requirements evaluate against employee duty flags.
6. Initial clearance is calculated.
7. Audit log is recorded.

## Employee profile

Profile displays:

- identity and employment metadata
- current clear-to-work status
- requirement checklist
- uploaded documents per requirement
- review/approval controls for HR/admin users
- recent audit activity

## Permissions

- Employee creation requires HR write role.
- Employee profile access is HR workspace access.
- Document upload/review actions enforce server-side user checks through actions/services.
