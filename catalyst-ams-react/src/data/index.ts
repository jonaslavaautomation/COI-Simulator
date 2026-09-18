import rawFields from './acordFields.json';
import scenario01 from './scenarios/scenario-01.json';
import scenario02 from './scenarios/scenario-02.json';
import scenario03 from './scenarios/scenario-03.json';
import scenario04 from './scenarios/scenario-04.json';
import scenario05 from './scenarios/scenario-05.json';
import type { AcordField, Scenario } from '@/types';

export const FORM_WIDTH = 612;
export const FORM_HEIGHT = 792;
export const ACORD_BACKGROUND = '/acord25-template.png';

export const FIELDS = rawFields as AcordField[];

export const SCENARIOS = [scenario01, scenario02, scenario03, scenario04, scenario05] as unknown as Scenario[];

export const LABELS: Record<string, string> = {};
FIELDS.forEach((f) => {
  if (f.label) LABELS[f.name] = f.label;
});

export function fieldLabel(name: string): string {
  return LABELS[name] || name;
}
