import { useEffect, useState } from 'react';
import { ChevronDown, FilePlus2, Menu, Plus, Search, UserRound } from 'lucide-react';
import { SCENARIOS } from '@/data';
import {
  LOB_DEFS, lobHasEvidence, lobPolicyNumber, lobEffDate, lobExpDate, lobInsurerName,
  insuredName, insuredAddressLine1, insuredCity, insuredState, insuredZip,
  parseRequester, parseEmailSubject, parseEmailBody, gradeScenario, computeFieldStatuses,
  checkVal, isAutoFillField,
} from '@/lib/scenarioHelpers';
import { loadState, saveState } from '@/lib/storage';
import type { FormValue, GradeResult, Scenario, TrainerState } from '@/types';
import { AcordFormScreen } from '@/components/AcordFormScreen';
import { CertHolderModal } from '@/components/CertHolderModal';
import { ResultModal } from '@/components/ResultModal';

type Screen = 'dashboard' | 'contact' | 'acord' | 'select' | 'acordform' | 'search' | 'customers' | 'prospects' | 'carriers';
type ModalKind = 'policiesFound' | 'certHolder' | null;

const formRows = [
  ['13', 'WITNESS CARD', '1995/02'], ['20', 'CERTIFICATE OF AVIATION LIABILITY INSURANCE', '2016/03'], ['21', 'CERTIFICATE OF AIRCRAFT INSURANCE', '2016/03'], ['22', 'INTERMODAL INTERCHANGE CERTIFICATE OF INSURANCE', '2016/03'], ['23', 'VEHICLE OR EQUIPMENT CERTIFICATE OF INSURANCE', '2016/03'], ['24', 'CERTIFICATE OF PROPERTY INSURANCE', '2016/03'], ['25', 'CERTIFICATE OF LIABILITY INSURANCE', '2016/03'], ['26', 'POLICY', '2016/03'], ['27', 'EVIDENCE OF PROPERTY INSURANCE', '2016/03'], ['28', 'EVIDENCE OF COMMERCIAL PROPERTY INSURANCE', '2016/03'], ['29', 'EVIDENCE OF FLOOD INSURANCE', '2016/03'], ['30', 'CERTIFICATE OF GARAGE INSURANCE', '2016/03'], ['31', 'CERTIFICATE OF MARINE / ENERGY INSURANCE', '2016/03'], ['35', 'CANCELLATION REQUEST / POLICY', '2016/03'], ['36', 'AGENT/BROKER OF RECORD CHANGE', '2017/01'], ['37', 'STATEMENT OF NO LOSS', '2016/03'],
];

const contactMenuItems = [
  { label: 'Search', screen: 'search' as Screen },
  { label: 'Customers', screen: 'customers' as Screen },
  { label: 'Prospects', screen: 'prospects' as Screen },
  { label: 'Carriers', screen: 'carriers' as Screen },
  { label: 'MGAs' },
  { label: 'Employees' },
  { label: 'Cert Holders' },
  { label: 'Lienholders' },
  { label: 'Finance Companies' },
  { label: 'Vendors' },
];

function App() {
  const [screen, setScreen] = useState<Screen>('dashboard');
  const [modal, setModal] = useState<ModalKind>(null);
  const [formSelected, setFormSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState('');
  const [scenarioIndex, setScenarioIndex] = useState(0);
  const [trainerState, setTrainerState] = useState<TrainerState>(() => loadState());
  const [fieldStatuses, setFieldStatuses] = useState<Record<string, 'correct' | 'error'> | null>(null);
  const [lastResult, setLastResult] = useState<GradeResult | null>(null);

  const scenario = SCENARIOS[scenarioIndex];
  const formValues = trainerState.forms[scenario.id] || {};
  const associatedLobs = trainerState.associated[scenario.id] || [];
  const passed = !!trainerState.passed[scenario.id];

  const notify = (message: string) => { setNotice(message); window.setTimeout(() => setNotice(''), 2400); };

  function updateState(mutator: (prev: TrainerState) => TrainerState) {
    setTrainerState((prev) => {
      const next = mutator(prev);
      if (next === prev) return prev;
      saveState(next);
      return next;
    });
  }

  // Auto-fills the AMS's own system-of-record fields (Producer/Insured/Insurer
  // identity, issue date, certificate number) plus the policy #/dates for any
  // line of business the student has already associated - never the coverage
  // judgment calls, which stay manual. Idempotent: only fills blanks.
  useEffect(() => {
    if (screen !== 'acordform') return;
    updateState((prev) => {
      const existing = prev.forms[scenario.id] || {};
      const next = { ...existing };
      let changed = false;
      scenario.expectedResults.checks.forEach((check) => {
        if (isAutoFillField(check.field) && !next[check.field]) {
          next[check.field] = check.value;
          changed = true;
        }
      });
      (prev.associated[scenario.id] || []).forEach((key) => {
        const lobDef = LOB_DEFS.find((l) => l.key === key);
        if (!lobDef?.policyPrefix) return;
        ['PolicyNumberIdentifier', 'EffectiveDate', 'ExpirationDate'].forEach((suffix) => {
          const fieldName = `F[0].P1[0].${lobDef.policyPrefix}${suffix}_A[0]`;
          if (!next[fieldName]) { next[fieldName] = checkVal(scenario, fieldName); changed = true; }
        });
      });
      if (!changed) return prev;
      return { ...prev, forms: { ...prev.forms, [scenario.id]: next } };
    });
    // Only re-run when the scenario or screen actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [screen, scenario.id]);

  function handleFieldChange(name: string, value: FormValue) {
    setFieldStatuses(null);
    updateState((prev) => ({
      ...prev,
      forms: { ...prev.forms, [scenario.id]: { ...(prev.forms[scenario.id] || {}), [name]: value } },
    }));
  }

  function handleSelectCustomer(index: number) {
    setScenarioIndex(index);
    setFieldStatuses(null);
    setLastResult(null);
    setScreen('contact');
  }

  function handleAssociateLob(key: string) {
    const lobDef = LOB_DEFS.find((l) => l.key === key)!;
    if (!lobHasEvidence(scenario, lobDef)) {
      notify('No policies are available to associate for this line of business.');
      return;
    }
    updateState((prev) => {
      const current = prev.associated[scenario.id] || [];
      if (current.includes(key)) return prev;
      return { ...prev, associated: { ...prev.associated, [scenario.id]: [...current, key] } };
    });
  }

  function handleSelectAcordRow(number: string) {
    if (number !== '25') {
      notify('Only ACORD 25 is available in this training module.');
      return;
    }
    setFormSelected('25');
  }

  function handleGoToSelectPolicies() {
    if (formSelected !== '25') { notify('Select ACORD 25 - Certificate of Liability Insurance first.'); return; }
    setScreen('select');
  }

  function handleApplyCertHolder(values: { name: string; line1: string; line2: string; city: string; state: string; zip: string }) {
    updateState((prev) => {
      const existing = prev.forms[scenario.id] || {};
      const next = {
        ...existing,
        'F[0].P1[0].CertificateHolder_FullName_A[0]': values.name,
        'F[0].P1[0].CertificateHolder_MailingAddress_LineOne_A[0]': values.line1,
        'F[0].P1[0].CertificateHolder_MailingAddress_LineTwo_A[0]': values.line2,
        'F[0].P1[0].CertificateHolder_MailingAddress_CityName_A[0]': values.city,
        'F[0].P1[0].CertificateHolder_MailingAddress_StateOrProvinceCode_A[0]': values.state,
        'F[0].P1[0].CertificateHolder_MailingAddress_PostalCode_A[0]': values.zip,
      };
      return { ...prev, forms: { ...prev.forms, [scenario.id]: next } };
    });
    setFieldStatuses(null);
    setModal(null);
  }

  function handleSaveAndClose() {
    const form = trainerState.forms[scenario.id] || {};
    const result = gradeScenario(scenario, form);
    setFieldStatuses(computeFieldStatuses(scenario, form));
    setLastResult(result);
    updateState((prev) => ({
      ...prev,
      attempts: { ...prev.attempts, [scenario.id]: (prev.attempts[scenario.id] || 0) + 1 },
      passed: result.passed ? { ...prev.passed, [scenario.id]: true } : prev.passed,
    }));
  }

  function handleReturnToContact() {
    setLastResult(null);
    setScreen('contact');
  }

  const scenarioOptions = SCENARIOS.map((s, index) => ({ index, name: insuredName(s), city: insuredCity(s), state: insuredState(s) }));

  return (
    <div className="legacy-app">
      <Header screen={screen} onNavigate={(next) => { setScreen(next); setModal(null); }} onNotify={notify} onAddAcord={() => setModal('policiesFound')} />
      {screen === 'dashboard' && <Dashboard scenarios={scenarioOptions} onSelectCustomer={handleSelectCustomer} onNotify={notify} />}
      {screen === 'contact' && <ContactScreen scenario={scenario} passed={passed} onAddAcord={() => setModal('policiesFound')} onNotify={notify} />}
      {screen === 'acord' && <AcordScreen selected={formSelected} onSelect={handleSelectAcordRow} onNext={handleGoToSelectPolicies} onCancel={() => setScreen('contact')} onNotify={notify} />}
      {screen === 'select' && <SelectPolicies scenario={scenario} associatedLobs={associatedLobs} onAssociate={handleAssociateLob} onNext={() => setScreen('acordform')} onCancel={() => setScreen('acord')} />}
      {screen === 'acordform' && (
        <AcordFormScreen
          formValues={formValues}
          associatedLobs={associatedLobs}
          fieldStatuses={fieldStatuses}
          onFieldChange={handleFieldChange}
          onManageCertHolder={() => setModal('certHolder')}
          onSaveAndClose={handleSaveAndClose}
          onCancel={() => { if (window.confirm('Discard this certificate and return to the contact record?')) setScreen('contact'); }}
          onNotify={notify}
        />
      )}
      {screen === 'search' && <SearchScreen onNotify={notify} />}
      {screen === 'customers' && <DirectoryScreen kind="Customers" onNotify={notify} />}
      {screen === 'prospects' && <DirectoryScreen kind="Prospects" onNotify={notify} />}
      {screen === 'carriers' && <DirectoryScreen kind="Carriers" onNotify={notify} />}
      {modal === 'policiesFound' && (
        <PoliciesFound scenario={scenario} onClose={() => setModal(null)} onContinue={() => { setModal(null); setFormSelected(null); setScreen('acord'); }} />
      )}
      {modal === 'certHolder' && <CertHolderModal scenario={scenario} onClose={() => setModal(null)} onApply={handleApplyCertHolder} />}
      {lastResult && <ResultModal result={lastResult} onContinueEditing={() => setLastResult(null)} onReturnToContact={handleReturnToContact} />}
      {notice && <div className="legacy-toast"><span>✓</span>{notice}</div>}
      <BottomBar onSearch={() => notify('Search is ready')} onNewContact={() => notify('New contact opened')} onNewTask={() => notify('New task opened')} onNewEmail={() => notify('New email opened')} />
    </div>
  );
}

function Header({ screen, onNavigate, onNotify, onAddAcord }: { screen: Screen; onNavigate: (next: Screen) => void; onNotify: (message: string) => void; onAddAcord: () => void }) {
  const contactsActive = ['contact', 'search', 'customers', 'prospects', 'carriers', 'acord', 'select', 'acordform'].includes(screen);
  return <><header className="legacy-header"><div className="qq-logo"><span>∿</span> QQ<span>Catalyst</span></div><nav><button className={screen === 'dashboard' ? 'active' : ''} onClick={() => onNavigate('dashboard')}>Dashboard</button><div className="contacts-nav"><button className={contactsActive ? 'active' : ''} onClick={() => onNavigate('contact')}>Contacts <ChevronDown size={10} /></button><div className="contacts-menu">{contactMenuItems.map((item) => <button key={item.label} onClick={() => item.screen ? onNavigate(item.screen) : onNotify(`${item.label} selected`)}>{item.label}</button>)}</div></div><button onClick={() => onNotify('Policies selected')}>Policies</button><button onClick={() => onNotify('AI selected')}>AI</button><button onClick={() => onNotify('Salesroom selected')}>Salesroom</button><button onClick={() => onNotify('Reports selected')}>Reports</button><button onClick={() => onNotify('Mailroom selected')}>Mailroom</button><button onClick={() => onNotify('More options opened')}>More <ChevronDown size={10} /></button></nav><div className="user-menu">Elle Canvas <UserRound size={20} fill="#737373" /><ChevronDown size={11} /></div><button className="mobile-top"><Menu size={18} /></button></header><div className="legacy-toolbar">{screen === 'dashboard' && <button className="dashboard-tab">My Dashboard</button>}{screen === 'contact' && <ContactToolbar onAddAcord={onAddAcord} onNotify={onNotify} />}{screen === 'acord' && <div className="green-crumb">Add ACORD Form</div>}{screen === 'select' && <div className="toolbar-space" />}{screen === 'acordform' && <div className="green-crumb">Page 1</div>}{screen === 'search' && <div className="directory-toolbar"><span>♟</span><span>Find</span><select><option>Contact</option><option>Customer</option><option>Prospect</option><option>Carrier</option></select><span className="toolbar-sep" /></div>}{['customers', 'prospects', 'carriers'].includes(screen) && <DirectoryToolbar kind={screen === 'customers' ? 'Customers' : screen === 'prospects' ? 'Prospects' : 'Carriers'} onNotify={onNotify} />}</div></>;
}

function ContactToolbar({ onAddAcord, onNotify }: { onAddAcord: () => void; onNotify: (message: string) => void }) {
  const tools = [['Delete Contact', '−'], ['Copy Contact', '◉'], ['Merge Contact To', '◆'], ['Change Status', '●'], ['Bill / Pay', '$'], ['Print / Email', '✉'], ['Add ACORD Form', '+'], ['Add Task', '✓'], ['Add Note', '+'], ['Policy Summary', '▤'], ['Policy Proposal', '▥'], ['New Policy', '+']];
  return <div className="contact-toolbar">{tools.map(([label, icon], index) => <button className={index === 6 ? 'toolbar-tool highlighted' : 'toolbar-tool'} key={label} onClick={() => index === 6 ? onAddAcord() : onNotify(`${label} selected`)}><strong>{icon}</strong><span>{label}</span></button>)}</div>;
}

function DirectoryToolbar({ kind, onNotify }: { kind: string; onNotify: (message: string) => void }) {
  const tools = [['Delete', '−'], ['Copy', '◉'], ['Merge', '◆'], ['Change Status', '●'], ['Bill / Pay', '$'], ['Print / Email', '✉'], ['Add Task', '✓'], ['Add Note', '+'], ['Policy Summary', '▤'], ['Export', '⇩']];
  return <div className="contact-toolbar">{tools.map(([label, icon]) => <button className="toolbar-tool" key={label} onClick={() => onNotify(`${label} selected`)}><strong>{icon}</strong><span>{label}</span></button>)}<span className="toolbar-title">{kind}</span></div>;
}

function Dashboard({ scenarios, onSelectCustomer, onNotify }: { scenarios: { index: number; name: string; city: string; state: string }[]; onSelectCustomer: (index: number) => void; onNotify: (message: string) => void }) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);
  const q = query.trim().toLowerCase();
  const filtered = scenarios.filter((s) => !q || s.name.toLowerCase().includes(q));

  return <main className="legacy-main dashboard-main"><div className="dash-columns"><div><LegacyPanel title="Search"><span className="panel-label">Enter Search Criteria</span><div className="legacy-search legacy-search-active"><Search size={18} /><input className="legacy-search-input" placeholder="Search Name, Policy #, Phone .." value={query} onChange={(e) => setQuery(e.target.value)} onFocus={() => setFocused(true)} onBlur={() => window.setTimeout(() => setFocused(false), 150)} /></div>{focused && <div className="search-dropdown">{filtered.length === 0 ? <div className="search-dropdown-empty">No matching customers.</div> : filtered.map((s) => <div key={s.index} className="search-dropdown-row" onMouseDown={() => onSelectCustomer(s.index)}><b>{s.name}</b><span>Matched Category: Customer &middot; {s.city}, {s.state}</span></div>)}</div>}</LegacyPanel><LegacyPanel title="Guided Workflow"><p className="panel-copy">Turn ON Guided Workflows to add new contacts and policies step-by-step. Turn OFF to add contacts and policies without guidance.</p><div className="workflow-toggle"><span>Guided Workflow</span><button onClick={() => onNotify('Guided workflow toggled')}>OFF</button></div></LegacyPanel></div><div><LegacyPanel title="Twitter"><div className="twitter-row"><b>♥</b><strong>Sign in to Twitter</strong></div></LegacyPanel><LegacyPanel title="Data Consumption"><p className="panel-copy">QQCatalyst® Plan: Catalyst - Professional Package</p><div className="gauge-card"><Gauge value="16" label="File Storage" unit="Gigabytes" /><Gauge value="2144" label="Active Customers" unit="0" /></div></LegacyPanel><LegacyPanel title="Source Of Business"><div className="chart-title">Top Policy <span>All Dates</span></div><div className="pie-chart"><b>53%</b></div></LegacyPanel></div><div><LegacyPanel title="Dashboard Filters"><div className="filter-grid"><span>Filtered by Users:</span><span>Filtered by Locations:</span><a>› Elle Canvas</a><a>› RALEIGH</a></div></LegacyPanel></div></div></main>;
}

function LegacyPanel({ title, children }: { title: string; children: React.ReactNode }) { return <section className="legacy-panel"><div className="legacy-panel-head"><strong>{title}</strong><span>◌ ? − ×</span></div><div className="legacy-panel-body">{children}</div></section>; }
function Gauge({ value, label, unit }: { value: string; label: string; unit: string }) { return <div className="gauge-wrap"><b>{label}</b><div className="gauge-ring"><span>{value}</span></div><small>{unit}</small></div>; }

const GENERIC_EMPTY: Record<string, string> = {
  Claims: 'No claims on file for this contact.',
  Billing: 'No open invoices for this contact.',
  Files: 'No files uploaded for this contact.',
  'Text Messages': 'No text message history for this contact.',
  Smartflows: 'No Smartflows have run for this contact.',
  Log: 'No activity log entries yet.',
};
const CONTACT_TABS = ['Customer Info', 'Policies', 'Claims', 'Billing', 'Files', 'Emails', 'ACORD', 'Tasks/Notes', 'Text Messages', 'Smartflows', 'Log'];

function ContactScreen({ scenario, passed, onAddAcord, onNotify }: { scenario: Scenario; passed: boolean; onAddAcord: () => void; onNotify: (message: string) => void }) {
  const [tab, setTab] = useState('Customer Info');
  const name = insuredName(scenario);
  const addr1 = insuredAddressLine1(scenario);
  const city = insuredCity(scenario);
  const state = insuredState(scenario);
  const zip = insuredZip(scenario);
  const requester = parseRequester(scenario);
  const certNumber = checkVal(scenario, 'F[0].P1[0].CertificateOfInsurance_CertificateNumberIdentifier_A[0]');

  return <main className="legacy-main contact-main"><div className="contact-banner"><div className="contact-photo"><UserRound size={58} /></div><div className="contact-column"><small>Contact Preference</small><strong>PHONE</strong></div><div className="contact-column"><small>Primary Contact Info</small><b>{name}</b><span>{addr1}, {city}, {state} {zip}</span></div><div className="contact-column"><small>Customer</small><b>{city}<br />{state}</b></div><div className="contact-column"><small>Balance</small><b>$0.00</b><span className="green-text">$0.00</span></div><button className="paperclip" onClick={() => onNotify('Not part of this training exercise.')}>▱</button></div><div className="contact-layout"><div><div className="contact-tabs">{CONTACT_TABS.map((t) => <button className={t === tab ? 'selected' : ''} key={t} onClick={() => setTab(t)}>{t}</button>)}</div>

    {tab === 'Customer Info' && <>
      <h3>Basic Contact Info</h3>
      <section className="info-box"><small>Contact Preference</small><strong>Phone</strong><div className="info-lines"><span>{name}</span><span>{addr1}, {city}, {state} {zip}</span><span>Primary contact</span><span>{requester.email}</span></div><button className="edit-btn" onClick={() => onNotify('Not part of this training exercise.')}>Edit ✎</button></section>
      <h3>Business Contacts <em>(1)</em><button onClick={() => onNotify('Not part of this training exercise.')}>⊕ Add A Contact</button></h3>
      <div className="simple-table"><div className="simple-th"><span>Contact</span><span>Contact Info</span><span>Contact Info Details</span></div><div className="simple-tr"><b>{requester.name || '—'}<br /><small>Primary Contact</small></b><span>{requester.email}</span><span>{requester.role}</span></div></div>
      <h3>Addresses <em>(1)</em></h3>
    </>}

    {tab === 'Policies' && <div className="policy-tab">
      {scenario.policyEvidence.map((p) => <div className="policy-block" key={p.label}><div className="policy-block-hd">{p.label}</div>{p.lines.map((l, i) => <div className="policy-block-line" key={i}>{l}</div>)}</div>)}
      {scenario.agencyNotes.map((n) => <div className="note-block" key={n.label}><b>{n.label}:</b> {n.lines.join(' ')}</div>)}
    </div>}

    {tab === 'Emails' && <div className="email-item"><div className="email-hd"><b>{parseEmailSubject(scenario)}</b><span>From: {requester.name} &lt;{requester.email}&gt;</span></div><div className="email-body">{parseEmailBody(scenario)}</div></div>}

    {tab === 'ACORD' && (passed
      ? <div className="simple-table"><div className="simple-th"><span>Form</span><span>Certificate #</span><span>Status</span></div><div className="simple-tr"><b>CERTIFICATE OF LIABILITY INSURANCE (2016/03)</b><span>{certNumber}</span><span className="status-complete">Completed</span></div></div>
      : <div className="tab-empty">No ACORD forms on file for this contact.</div>)}

    {tab === 'Tasks/Notes' && (scenario.agencyNotes.length
      ? scenario.agencyNotes.map((n) => <div className="note-block" key={n.label}>{n.lines.join(' ')}</div>)
      : <div className="tab-empty">No account notes on file.</div>)}

    {GENERIC_EMPTY[tab] && <div className="tab-empty">{GENERIC_EMPTY[tab]}</div>}

  </div><aside className="navigation-box"><b>Navigation</b><hr /><a>Basic Contact Info</a><a>Contact Info Details</a><a>Account</a><a>Linked Accounts</a><a>Policies</a><a>Social Media</a></aside></div><button className="floating-acord" onClick={onAddAcord}><FilePlus2 size={18} /> Add ACORD Form</button></main>;
}

function PoliciesFound({ scenario, onClose, onContinue }: { scenario: Scenario; onClose: () => void; onContinue: () => void }) {
  const rows = LOB_DEFS.filter((l) => lobHasEvidence(scenario, l));
  return <div className="legacy-modal-overlay"><div className="policies-modal"><div className="modal-green-head">Policies Found <button onClick={onClose}>×</button></div><div className="modal-content"><p>Below is a list of policies on file for this contact. Select a policy or continue with the ACORD form without a policy.</p><label className="associate"><input type="radio" checked readOnly /> Associate to Contact Only</label><div className="policy-grid"><b>Effective</b><b>Expiration</b><b>Line Of Business</b><b>Carrier</b><b>Policy Number</b><b>Premium</b><b>Status</b>{rows.length === 0 && <span style={{ gridColumn: '1 / -1', color: '#888' }}>No active policies on file for this contact.</span>}{rows.map((l) => <div className="policy-grid-row" key={l.key}><span>{lobEffDate(scenario, l)}</span><span>{lobExpDate(scenario, l)}</span><span>{l.label}</span><span>{lobInsurerName(scenario, l)}</span><span>{lobPolicyNumber(scenario, l)}</span><span>—</span><span>Active</span></div>)}</div></div><div className="modal-actions"><button onClick={onClose}>Cancel ×</button><button className="ok-btn" onClick={onContinue}>OK ✓</button></div></div></div>;
}

function AcordScreen({ selected, onSelect, onNext, onCancel, onNotify }: { selected: string | null; onSelect: (value: string) => void; onNext: () => void; onCancel: () => void; onNotify: (message: string) => void }) {
  return <main className="legacy-main acord-main"><div className="acord-table">{formRows.map(([number, name, version]) => <button className={selected === number ? 'form-row selected' : 'form-row'} key={number} onClick={() => { onSelect(number); if (number === '25') onNotify(`${name} selected`); }}><span>{number}</span><b>{name}</b><select value={version} onChange={() => undefined} onClick={(event) => event.stopPropagation()}><option>{version}</option></select></button>)}</div><div className="acord-bottom"><button onClick={onCancel}>Cancel ×</button><button className="next-btn" disabled={selected !== '25'} onClick={onNext}>Next ➜</button></div></main>;
}

function SelectPolicies({ scenario, associatedLobs, onAssociate, onNext, onCancel }: { scenario: Scenario; associatedLobs: string[]; onAssociate: (key: string) => void; onNext: () => void; onCancel: () => void }) {
  return <main className="legacy-main select-main"><section className="select-head"><h3>▧ Select Policies...</h3><p>Select the policies you would like represented on your certificate of insurance by clicking Associate Policy for each line of business.</p></section><div className="select-table"><div className="select-th"><b>LINE OF BUSINESS</b><b>EFFECTIVE</b><b>EXPIRATION</b><b>POLICY NUMBER</b><b /></div>{LOB_DEFS.map((lobDef) => {
    const has = lobHasEvidence(scenario, lobDef);
    const assoc = associatedLobs.includes(lobDef.key);
    if (assoc) {
      return <div className="select-row" key={lobDef.key}><span>{lobDef.label}</span><span>{lobEffDate(scenario, lobDef)}</span><span>{lobExpDate(scenario, lobDef)}</span><span>{lobPolicyNumber(scenario, lobDef)}</span><span className="lob-associated">&#10003; Associated</span></div>;
    }
    return <div className="select-row" key={lobDef.key}><span>{lobDef.label}</span><span className={has ? 'row-message row-available' : 'row-message'}>{has ? 'POLICIES AVAILABLE FOR THIS LINE' : 'NO POLICIES TO DISPLAY FOR THIS LINE'}</span><button onClick={() => onAssociate(lobDef.key)}>⊕ Associate Policy</button></div>;
  })}</div><div className="acord-bottom select-bottom"><button onClick={onCancel}>Cancel ×</button><button className="next-btn" disabled={associatedLobs.length === 0} onClick={onNext}>Next ➜</button></div></main>;
}

function SearchScreen({ onNotify }: { onNotify: (message: string) => void }) {
  return <main className="legacy-main search-main"><h2 className="screen-title">Contacts &gt; Search</h2><div className="search-layout"><div className="search-criteria"><section className="legacy-panel"><div className="legacy-panel-head"><strong>Search Criteria</strong><span>◌ ? − ×</span></div><div className="legacy-panel-body"><div className="search-form"><label>First Name<input /></label><label>Last Name<input /></label><label>Business Name<input /></label><label>SSN<input /></label><label>FEIN<input /></label><label>Phone<input /></label><label>Email<input /></label><label>Address<input /></label><label>City<input /></label><label>State<select><option>Any</option><option>NC</option><option>SC</option><option>VA</option></select></label><label>Zip<input /></label><label>Contact Type<select><option>Any</option><option>Customer</option><option>Prospect</option><option>Carrier</option></select></label><label>Status<select><option>Any</option><option>Active</option><option>Inactive</option></select></label></div><div className="search-buttons"><button className="search-btn-primary" onClick={() => onNotify('Search started')}>Search</button><button className="search-btn-clear" onClick={() => onNotify('Search cleared')}>Clear</button></div></div></section></div><div className="search-results"><section className="legacy-panel"><div className="legacy-panel-head"><strong>Search Results</strong><span>◌ ? − ×</span></div><div className="search-results-body"><div className="search-results-empty">No contacts found. Enter search criteria and click Search.</div></div></section></div></div></main>;
}

type DirRow = { name: string; type: string; phone: string; email: string; city: string; state: string; policies: number; balance: string; status: string };

function DirectoryScreen({ kind, onNotify }: { kind: string; onNotify: (message: string) => void }) {
  const rows: DirRow[] = kind === 'Customers' ? [
    { name: 'Harbor Point LLC', type: 'Commercial', phone: '(919) 555-0184', email: 'info@harborpoint.com', city: 'Raleigh', state: 'NC', policies: 4, balance: '$0.00', status: 'Active' },
    { name: 'Acme Manufacturing', type: 'Commercial', phone: '(919) 555-0112', email: 'admin@acme.com', city: 'Raleigh', state: 'NC', policies: 6, balance: '$240.00', status: 'Active' },
    { name: 'Northstar Construction', type: 'Commercial', phone: '(704) 555-0199', email: 'office@northstar.com', city: 'Charlotte', state: 'NC', policies: 3, balance: '$0.00', status: 'Active' },
    { name: 'Pine & Co.', type: 'Commercial', phone: '(919) 555-0173', email: 'contact@pineco.com', city: 'Durham', state: 'NC', policies: 2, balance: '$1,120.00', status: 'Active' },
    { name: 'Summit Logistics', type: 'Commercial', phone: '(336) 555-0142', email: 'ops@summitlog.com', city: 'Greensboro', state: 'NC', policies: 5, balance: '$0.00', status: 'Active' },
    { name: 'BlueRidge Builders', type: 'Commercial', phone: '(828) 555-0188', email: 'main@blueridge.com', city: 'Asheville', state: 'NC', policies: 2, balance: '$0.00', status: 'Inactive' },
  ] : kind === 'Prospects' ? [
    { name: 'Evergreen Cafe', type: 'Prospect', phone: '(919) 555-0150', email: 'hello@evergreen.com', city: 'Raleigh', state: 'NC', policies: 0, balance: '$0.00', status: 'Prospect' },
    { name: 'Carolina Transit Co.', type: 'Prospect', phone: '(704) 555-0167', email: 'info@carolinatransit.com', city: 'Charlotte', state: 'NC', policies: 0, balance: '$0.00', status: 'Prospect' },
    { name: 'Meridian Foods', type: 'Prospect', phone: '(919) 555-0145', email: 'office@meridianfoods.com', city: 'Cary', state: 'NC', policies: 0, balance: '$0.00', status: 'Quote Sent' },
    { name: 'Southland Equipment', type: 'Prospect', phone: '(910) 555-0123', email: 'sales@southlandeq.com', city: 'Wilmington', state: 'NC', policies: 0, balance: '$0.00', status: 'Prospect' },
  ] : [
    { name: 'Erie Insurance', type: 'Carrier', phone: '(800) 555-0100', email: 'agent@erieinsurance.com', city: 'Erie', state: 'PA', policies: 0, balance: '—', status: 'Active' },
    { name: 'Travelers', type: 'Carrier', phone: '(800) 555-0200', email: 'service@travelers.com', city: 'Hartford', state: 'CT', policies: 0, balance: '—', status: 'Active' },
    { name: 'Liberty Mutual', type: 'Carrier', phone: '(800) 555-0300', email: 'support@libertymutual.com', city: 'Boston', state: 'MA', policies: 0, balance: '—', status: 'Active' },
    { name: 'The Hartford', type: 'Carrier', phone: '(800) 555-0400', email: 'contact@thehartford.com', city: 'Hartford', state: 'CT', policies: 0, balance: '—', status: 'Active' },
    { name: 'Nationwide', type: 'Carrier', phone: '(800) 555-0500', email: 'info@nationwide.com', city: 'Columbus', state: 'OH', policies: 0, balance: '—', status: 'Inactive' },
  ];
  return <main className="legacy-main directory-main"><h2 className="screen-title">Contacts &gt; {kind}</h2><section className="legacy-panel directory-panel"><div className="legacy-panel-head"><strong>{kind}</strong><span>◌ ? − ×</span></div><div className="directory-toolbar-row"><div className="directory-search"><Search size={16} /><input placeholder="Search name, phone, email..." /></div><div className="directory-filters"><button onClick={() => onNotify('Status filter opened')}><span>Status:</span> All <ChevronDown size={12} /></button><button onClick={() => onNotify('Sort filter opened')}><span>Sort:</span> Name <ChevronDown size={12} /></button></div></div><div className="directory-table-wrap"><table className="directory-table"><thead><tr><th>Name</th><th>Type</th><th>Phone</th><th>Email</th><th>City</th><th>State</th><th>Policies</th><th>Balance</th><th>Status</th><th /></tr></thead><tbody>{rows.map((row) => <tr key={row.name} onClick={() => onNotify(`${row.name} selected`)}><td><strong>{row.name}</strong></td><td>{row.type}</td><td>{row.phone}</td><td className="email-cell">{row.email}</td><td>{row.city}</td><td>{row.state}</td><td>{row.policies}</td><td>{row.balance}</td><td><span className={`dir-status ${row.status.toLowerCase().replace(/[^a-z]/g, '')}`}>{row.status}</span></td><td><button className="dir-dots" onClick={(e) => { e.stopPropagation(); onNotify(`${row.name} options`); }}>⋮</button></td></tr>)}</tbody></table></div></section></main>;
}

function BottomBar({ onSearch, onNewContact, onNewTask, onNewEmail }: { onSearch: () => void; onNewContact: () => void; onNewTask: () => void; onNewEmail: () => void }) { return <div className="bottom-bar"><button className="bottom-search" onClick={onSearch}><Search size={17} />Search Name, Policy #, Phone ...</button><button onClick={onNewContact}><Plus size={18} /> New Contact</button><button onClick={onNewTask}>✓ New Task</button><button onClick={onNewEmail}><Plus size={18} /> New Email</button><span className="bottom-spacer" /><span className="bottom-tray">▱ ▰ ♟</span></div>; }

export default App;
