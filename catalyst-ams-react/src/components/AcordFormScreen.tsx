import { FIELDS, FORM_WIDTH, FORM_HEIGHT, ACORD_BACKGROUND, fieldLabel } from '@/data';
import { LOB_DEFS, isAutoFillField } from '@/lib/scenarioHelpers';
import type { AcordField, FormValue, FormValues } from '@/types';

function makeFieldClass(field: AcordField): string {
  const name = field.name;
  let cls = field.type === 'checkbox' ? 'acord-field checkbox' : 'acord-field';
  if (/Amount|Aggregate|Limit|Expense|Damage|Injury/.test(name)) cls += ' amount';
  if (/Date/.test(name)) cls += ' date';
  if (/Code|Indicator/.test(name) && field.type === 'text') cls += ' code';
  if (/PostalCode/.test(name)) cls += ' zip';
  return cls;
}

function isSystemFilled(fieldName: string, associatedLobs: string[]): boolean {
  if (isAutoFillField(fieldName)) return true;
  for (const lobDef of LOB_DEFS) {
    if (!lobDef.policyPrefix || !associatedLobs.includes(lobDef.key)) continue;
    const suffixes = ['PolicyNumberIdentifier', 'EffectiveDate', 'ExpirationDate'];
    if (suffixes.some((suf) => fieldName === `F[0].P1[0].${lobDef.policyPrefix}${suf}_A[0]`)) return true;
  }
  return false;
}

interface Props {
  formValues: FormValues;
  associatedLobs: string[];
  fieldStatuses: Record<string, 'correct' | 'error'> | null;
  onFieldChange: (name: string, value: FormValue) => void;
  onManageCertHolder: () => void;
  onSaveAndClose: () => void;
  onCancel: () => void;
  onNotify: (message: string) => void;
}

export function AcordFormScreen({ formValues, associatedLobs, fieldStatuses, onFieldChange, onManageCertHolder, onSaveAndClose, onCancel, onNotify }: Props) {
  return (
    <main className="legacy-main acordform-main">
      <div className="acordform-toolbar">
        <a onClick={onManageCertHolder}>+ Manage Certificate Holders</a>
        <a onClick={() => onNotify('Not part of this training exercise.')}>+ Import/Change Signature</a>
        <a onClick={() => onNotify('Not part of this training exercise.')}>- Remove Signature</a>
        <span className="acordform-page-pill">Page 1 of 1</span>
      </div>
      <div className="acordform-legend">
        <span><i className="swatch swatch-auto" /> Auto-filled by the AMS</span>
        <span><i className="swatch swatch-manual" /> Entered by you</span>
      </div>
      <div className="acordform-page-wrap">
        <div className="acordform-page" style={{ backgroundImage: `url(${ACORD_BACKGROUND})` }}>
          {FIELDS.map((field) => {
            const value = formValues[field.name];
            const status = fieldStatuses?.[field.name] ?? null;
            const auto = isSystemFilled(field.name, associatedLobs);
            const classes = [makeFieldClass(field), auto ? 'autofill' : '', status ?? ''].filter(Boolean).join(' ');
            const style = {
              left: `${(field.x / FORM_WIDTH) * 100}%`,
              top: `${(field.y / FORM_HEIGHT) * 100}%`,
              width: `${(field.w / FORM_WIDTH) * 100}%`,
              height: `${(field.h / FORM_HEIGHT) * 100}%`,
            };
            const title = fieldLabel(field.name);
            if (field.name.includes('RemarkText')) {
              return (
                <textarea
                  key={field.name}
                  className={classes}
                  style={style}
                  title={title}
                  data-field={field.name}
                  value={(value as string) || ''}
                  onChange={(e) => onFieldChange(field.name, e.target.value)}
                />
              );
            }
            if (field.type === 'checkbox') {
              return (
                <input
                  key={field.name}
                  type="checkbox"
                  className={classes}
                  style={style}
                  title={title}
                  data-field={field.name}
                  checked={!!value}
                  onChange={(e) => onFieldChange(field.name, e.target.checked)}
                />
              );
            }
            return (
              <input
                key={field.name}
                type="text"
                className={classes}
                style={style}
                title={title}
                data-field={field.name}
                value={(value as string) || ''}
                placeholder={/PhoneNumber|FaxNumber/.test(field.name) ? '###-###-####' : /Date/.test(field.name) ? 'MM/DD/YYYY' : undefined}
                onChange={(e) => onFieldChange(field.name, e.target.value)}
              />
            );
          })}
        </div>
      </div>
      <div className="acordform-bottombar">
        <button onClick={onCancel}>Cancel</button>
        <div className="acordform-bottombar-right">
          <button onClick={() => onNotify('Not part of this training exercise.')}>Print</button>
          <button onClick={() => onNotify('Not part of this training exercise.')}>Email</button>
          <button disabled title="This is page 1 of 1">&#9664; Prev</button>
          <button className="acordform-save" onClick={onSaveAndClose}>Save And Close &#10132;</button>
        </div>
      </div>
    </main>
  );
}
