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

The directory supports employee listing and filtering/search through server-side query utilities. To keep the operational list easy to scan, each row shows the employee name with its blue employee-number identifier aligned alongside it; email remains searchable and is available in the employee profile rather than displayed in every directory row.

## Create employee flow

1. HR/admin submits employee creation form.
2. Input is validated by schema.
3. Employee record is created.
4. Active role requirements are assigned to the employee.
5. Conditional requirements evaluate against employee duty flags.
6. Initial clearance is calculated.
7. Audit log is recorded.
8. A linked app user with the `EMPLOYEE` role is created or connected by matching email.
9. When requested, Cognito provisions the account and emails first-login instructions. Invitation failure does not roll back the employee record and can be retried from the profile.

## Employee profile

Profile displays:

- identity and employment metadata
- current clear-to-work status
- requirement checklist
- uploaded documents per requirement
- review/approval controls for HR/admin users
- recent audit activity

The profile separates independent information into URL-based tabs to avoid presenting all employee data as one long page:

- **Compliance** is the default tab and contains the requirement checklist and document actions.
- **Employment** contains employment metadata and contact information.
- **Access** contains invitation status and, for users with employee-management permission, the delete action.
- **Activity** contains the employee audit history.

Tab links use the `tab` query parameter, for example `/employees/{id}?tab=activity`. The active tab must be server-rendered and directly linkable.

## Delete employee

HR users can delete an employee from the employee profile after confirming a destructive-action prompt. The system must:

1. Reject attempts to delete the acting user's own employee profile.
2. Disable the linked Cognito account when the employee has one.
3. Deactivate and unlink the related app `User` record rather than deleting that authorization record.
4. Delete the employee and its related compliance records and documents according to database relations.
5. Attempt to remove each stored document object after the database deletion. A storage cleanup failure must be logged and must not roll back the completed employee deletion.
6. Record the `EMPLOYEE_DELETED` audit event before deleting the employee.

## Permissions

- Employee creation requires HR write role.
- Employee profile access is HR workspace access.
- Document upload/review actions enforce server-side user checks through actions/services.
