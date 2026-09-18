import type { Scenario, LobDef, FormValues, GradeResult } from '@/types';
import { fieldLabel } from '@/data';
import { compareValue, isBlankValue } from '@/lib/grading';

// Single source of truth for every "system of record" value shown anywhere
// in the AMS chrome: the scenario's own graded answer key (expectedResults
// .checks). Never parsed from the free-text packet, so nothing displayed can
// drift from what actually gets graded.
export function checkVal(scenario: Scenario, fieldName: string): string {
  const c = scenario.expectedResults.checks.find((c) => c.field === fieldName);
  return c ? String(c.value) : '';
}

export function reqBlock(scenario: Scenario, label: string): string[] {
  const b = scenario.request.find((r) => r.label === label);
  return b ? b.lines : [];
}

export function insuredName(s: Scenario): string { return checkVal(s, 'F[0].P1[0].NamedInsured_FullName_A[0]'); }
export function insuredAddressLine1(s: Scenario): string { return checkVal(s, 'F[0].P1[0].NamedInsured_MailingAddress_LineOne_A[0]'); }
export function insuredCity(s: Scenario): string { return checkVal(s, 'F[0].P1[0].NamedInsured_MailingAddress_CityName_A[0]'); }
export function insuredState(s: Scenario): string { return checkVal(s, 'F[0].P1[0].NamedInsured_MailingAddress_StateOrProvinceCode_A[0]'); }
export function insuredZip(s: Scenario): string { return checkVal(s, 'F[0].P1[0].NamedInsured_MailingAddress_PostalCode_A[0]'); }

export interface ParsedRequester { name: string; role: string; email: string }
export function parseRequester(scenario: Scenario): ParsedRequester {
  const lines = reqBlock(scenario, 'Client Email');
  const fromLine = lines.find((l) => l.startsWith('From:')) || '';
  const m = fromLine.match(/From:\s*([^,]+),\s*([^<]+?)\s*<([^>]+)>/);
  if (!m) return { name: '', role: '', email: '' };
  return { name: m[1].trim(), role: m[2].trim(), email: m[3].trim() };
}
export function parseEmailSubject(scenario: Scenario): string {
  const lines = reqBlock(scenario, 'Client Email');
  const l = lines.find((x) => x.startsWith('Subject:'));
  return l ? l.replace(/^Subject:\s*/, '') : '';
}
export function parseEmailBody(scenario: Scenario): string {
  const lines = reqBlock(scenario, 'Client Email');
  return lines.filter((l) => !/^(From:|To:|Subject:)/.test(l)).join('\n');
}

export const LOB_DEFS: LobDef[] = [
  { key: 'gl', label: 'General Liability', evidenceMatch: /General Liability/i, policyPrefix: 'Policy_GeneralLiability_', letterField: 'GeneralLiability_InsurerLetterCode_A[0]' },
  { key: 'auto', label: 'Commercial Auto', evidenceMatch: /Automobile Liability/i, policyPrefix: 'Policy_AutomobileLiability_', letterField: 'Vehicle_InsurerLetterCode_A[0]' },
  { key: 'umb', label: 'Umbrella/Excess', evidenceMatch: /Umbrella|Excess/i, policyPrefix: 'Policy_ExcessLiability_', letterField: 'ExcessUmbrella_InsurerLetterCode_A[0]' },
  { key: 'wc', label: 'Workers Comp', evidenceMatch: /Workers Compensation/i, policyPrefix: 'Policy_WorkersCompensationAndEmployersLiability_', letterField: 'WorkersCompensationEmployersLiability_InsurerLetterCode_A[0]' },
  { key: 'other', label: 'Other', evidenceMatch: null, policyPrefix: null, letterField: null },
];

export function lobHasEvidence(scenario: Scenario, lobDef: LobDef): boolean {
  if (!lobDef.evidenceMatch) return false;
  return scenario.policyEvidence.some((p) => lobDef.evidenceMatch!.test(p.label));
}
export function lobPolicyNumber(scenario: Scenario, lobDef: LobDef): string {
  return lobDef.policyPrefix ? checkVal(scenario, `F[0].P1[0].${lobDef.policyPrefix}PolicyNumberIdentifier_A[0]`) : '';
}
export function lobEffDate(scenario: Scenario, lobDef: LobDef): string {
  return lobDef.policyPrefix ? checkVal(scenario, `F[0].P1[0].${lobDef.policyPrefix}EffectiveDate_A[0]`) : '';
}
export function lobExpDate(scenario: Scenario, lobDef: LobDef): string {
  return lobDef.policyPrefix ? checkVal(scenario, `F[0].P1[0].${lobDef.policyPrefix}ExpirationDate_A[0]`) : '';
}
export function lobInsurerLetter(scenario: Scenario, lobDef: LobDef): string {
  return lobDef.letterField ? checkVal(scenario, `F[0].P1[0].${lobDef.letterField}`) : '';
}
export function lobInsurerName(scenario: Scenario, lobDef: LobDef): string {
  const letter = lobInsurerLetter(scenario, lobDef);
  return letter ? checkVal(scenario, `F[0].P1[0].Insurer_FullName_${letter}[0]`) : '';
}

// Boilerplate account/agency fields a real AMS pulls from the account &
// policy record automatically - never the coverage judgment calls, which
// stay 100% manual, same split as the ams-qqcatalyst.html trainer.
export function isAutoFillField(name: string): boolean {
  if (name === 'F[0].P1[0].Form_CompletionDate_A[0]') return true;
  if (/^F\[0\]\.P1\[0\]\.Producer_/.test(name)) return true;
  if (/^F\[0\]\.P1\[0\]\.NamedInsured_/.test(name)) return true;
  if (/^F\[0\]\.P1\[0\]\.Insurer_(FullName|NAICCode)_[A-F]\[0\]$/.test(name)) return true;
  if (name === 'F[0].P1[0].CertificateOfInsurance_CertificateNumberIdentifier_A[0]') return true;
  return false;
}

export function gradeScenario(scenario: Scenario, form: FormValues): GradeResult {
  const errors: string[] = [];
  let correct = 0;
  const total = scenario.expectedResults.checks.length + scenario.expectedResults.blankChecks.length;

  scenario.expectedResults.checks.forEach((check) => {
    const actual = form[check.field];
    const ok = compareValue(actual, check.value, check.compare);
    if (ok) correct += 1;
    else errors.push(`${fieldLabel(check.field)} should match the policy file.`);
  });
  scenario.expectedResults.blankChecks.forEach((check) => {
    const actual = form[check.field];
    const ok = isBlankValue(actual, check.compare);
    if (ok) correct += 1;
    else errors.push(`${fieldLabel(check.field)} should be left blank or unchecked in this scenario.`);
  });

  const passed = errors.length === 0;
  return { score: Math.round((correct / total) * 100), passed, errors };
}

export function computeFieldStatuses(scenario: Scenario, form: FormValues): Record<string, 'correct' | 'error'> {
  const statuses: Record<string, 'correct' | 'error'> = {};
  scenario.expectedResults.checks.forEach((check) => {
    statuses[check.field] = compareValue(form[check.field], check.value, check.compare) ? 'correct' : 'error';
  });
  scenario.expectedResults.blankChecks.forEach((check) => {
    statuses[check.field] = isBlankValue(form[check.field], check.compare) ? 'correct' : 'error';
  });
  return statuses;
}

export function fieldStatus(scenario: Scenario, form: FormValues, fieldName: string): 'correct' | 'error' | null {
  const check = scenario.expectedResults.checks.find((c) => c.field === fieldName);
  if (check) return compareValue(form[fieldName], check.value, check.compare) ? 'correct' : 'error';
  const blank = scenario.expectedResults.blankChecks.find((c) => c.field === fieldName);
  if (blank) return isBlankValue(form[fieldName], blank.compare) ? 'correct' : 'error';
  return null;
}
