export type EmployeeDutyFacts = {
  transportsParticipants: boolean;
  performsMedicationDuties: boolean;
};

export function isConditionSatisfied(
  conditional: boolean,
  conditionKey: string | null,
  facts: EmployeeDutyFacts,
): boolean {
  if (!conditional) return true;
  if (conditionKey === "TRANSPORTS_PARTICIPANTS") return facts.transportsParticipants;
  if (conditionKey === "PERFORMS_MEDICATION_DUTIES") return facts.performsMedicationDuties;
  return false;
}
