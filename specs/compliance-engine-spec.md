# Compliance Engine Specification

## Goal

Determine whether an employee is cleared to work based on applicable pre-work requirements.

## Implemented files

- `lib/compliance/applicability.ts`
- `lib/compliance/clearance.ts`
- `lib/compliance/expiration.ts`
- `lib/compliance/refresh.ts`
- `lib/compliance/index.ts`
- `lib/compliance/types.ts`
- `tests/compliance.test.ts`

## Requirement applicability

An `EmployeeRequirement` is applicable when:

- it is active, and
- it is not conditional, or its condition is satisfied.

Supported condition keys:

- `TRANSPORTS_PARTICIPANTS`
- `PERFORMS_MEDICATION_DUTIES`

## Clearance rule

An employee is cleared only when all applicable requirements marked `requiredBeforeWork` are satisfied.

A requirement satisfies clearance when:

- it is approved when approval is required, or completed where applicable; and
- it is not expired.

The engine fails closed if a role has no applicable pre-work requirements.

## Expiration behavior

Credentials remain valid through their expiration date. Expiration can be derived even if persisted status has not yet been refreshed.

## Refresh behavior

`refreshEmployeeClearance()` recalculates clearance, updates employee clearance fields, and records a `ClearanceEvent` when status changes.

## Test coverage

The compliance test suite covers applicability, expiration, clearance status, and reminder-related rules.
