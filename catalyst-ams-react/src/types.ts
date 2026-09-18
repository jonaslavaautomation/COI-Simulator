export interface AcordField {
  id: string;
  name: string;
  type: 'text' | 'checkbox';
  x: number;
  y: number;
  w: number;
  h: number;
  required: boolean;
  label: string | null;
}

export type CompareKind = 'text' | 'money' | 'phone' | 'date' | 'code' | 'zip' | 'email' | 'checkbox';
export type BlankCompareKind = 'unchecked' | 'blank';

export interface ScenarioCheck {
  field: string;
  value: string | boolean;
  compare: CompareKind;
}

export interface ScenarioBlankCheck {
  field: string;
  compare: BlankCompareKind;
}

export interface ScenarioTextBlock {
  label: string;
  lines: string[];
}

export interface QaRule {
  topic: string;
  requested: boolean;
  request: string;
  evidence: string;
  supported: 'supported' | 'not_supported' | 'needs_review';
  action: string;
  acordField: string;
}

export interface Scenario {
  id: string;
  title: string;
  formType: string;
  summary: string;
  instructions: string[];
  request: ScenarioTextBlock[];
  policyEvidence: ScenarioTextBlock[];
  endorsements: ScenarioTextBlock[];
  agencyNotes: ScenarioTextBlock[];
  expectedResults: {
    checks: ScenarioCheck[];
    blankChecks: ScenarioBlankCheck[];
  };
  qaRules: QaRule[];
  mistakes: string[];
}

export type FormValue = string | boolean;
export type FormValues = Record<string, FormValue>;

export interface LobDef {
  key: 'gl' | 'auto' | 'umb' | 'wc' | 'other';
  label: string;
  evidenceMatch: RegExp | null;
  policyPrefix: string | null;
  letterField: string | null;
}

export interface TrainerState {
  forms: Record<string, FormValues>;
  passed: Record<string, boolean>;
  attempts: Record<string, number>;
  associated: Record<string, string[]>;
}

export interface GradeResult {
  score: number;
  passed: boolean;
  errors: string[];
}
