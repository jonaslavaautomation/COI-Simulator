import { useState } from 'react';
import { reqBlock } from '@/lib/scenarioHelpers';
import type { Scenario } from '@/types';

interface Props {
  scenario: Scenario;
  onClose: () => void;
  onApply: (values: { name: string; line1: string; line2: string; city: string; state: string; zip: string }) => void;
}

export function CertHolderModal({ scenario, onClose, onApply }: Props) {
  const referenceLines = reqBlock(scenario, 'Certificate Holder / Requestor');
  const [name, setName] = useState('');
  const [line1, setLine1] = useState('');
  const [line2, setLine2] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');

  return (
    <div className="legacy-modal-overlay">
      <div className="cert-holder-modal">
        <div className="modal-green-head">Manage Certificate Holders <button onClick={onClose}>&times;</button></div>
        <div className="modal-content cert-holder-content">
          <div className="cert-ref-card">
            <div className="cert-ref-hd">As stated in the client&apos;s request</div>
            <div className="cert-ref-body">{referenceLines.join('\n')}</div>
          </div>
          <label className="ch-field">Certificate Holder Name<input value={name} onChange={(e) => setName(e.target.value)} /></label>
          <label className="ch-field">Address Line 1<input value={line1} onChange={(e) => setLine1(e.target.value)} /></label>
          <label className="ch-field">Address Line 2<input value={line2} onChange={(e) => setLine2(e.target.value)} /></label>
          <div className="ch-row">
            <label className="ch-field">City<input value={city} onChange={(e) => setCity(e.target.value)} /></label>
            <label className="ch-field ch-narrow">State<input value={state} maxLength={2} onChange={(e) => setState(e.target.value)} /></label>
            <label className="ch-field ch-narrow">ZIP<input value={zip} onChange={(e) => setZip(e.target.value)} /></label>
          </div>
        </div>
        <div className="modal-actions">
          <button onClick={onClose}>Cancel</button>
          <button className="ok-btn" onClick={() => onApply({ name, line1, line2, city, state, zip })}>Add to Certificate</button>
        </div>
      </div>
    </div>
  );
}
