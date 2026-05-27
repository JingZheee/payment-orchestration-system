import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
  Alert, Button, Checkbox, Divider, Input, Select, Steps, Typography,
} from 'antd';
import { ArrowLeftOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { storeService, type StoreProduct } from './services/storeService';

const { Text } = Typography;

// ── Currency formatting ───────────────────────────────────────────────────────

function formatAmount(amount: number, currency: string): string {
  if (currency === 'IDR') return `IDR ${amount.toLocaleString('id-ID')}`;
  return `${currency} ${Number(amount).toFixed(2)}`;
}

// ── NRIC helpers (Malaysia only) ──────────────────────────────────────────────

function formatNRIC(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 12);
  if (d.length <= 6) return d;
  if (d.length <= 8) return `${d.slice(0, 6)}-${d.slice(6)}`;
  return `${d.slice(0, 6)}-${d.slice(6, 8)}-${d.slice(8)}`;
}

function parseNRIC(nric: string): { dob: string; gender: string } | null {
  const d = nric.replace(/\D/g, '');
  if (d.length < 12) return null;
  const yy = parseInt(d.slice(0, 2));
  const mm = d.slice(2, 4);
  const dd = d.slice(4, 6);
  const year = yy <= 25 ? 2000 + yy : 1900 + yy;
  return { dob: `${dd}/${mm}/${year}`, gender: parseInt(d[11]) % 2 === 0 ? 'Female' : 'Male' };
}

// ── Payment methods per region ────────────────────────────────────────────────

interface MethodOption { id: string; label: string; abbr: string; description: string }

const METHODS_BY_REGION: Record<string, MethodOption[]> = {
  MY: [
    { id: 'FPX',      label: 'Online Banking (FPX)', abbr: 'FPX', description: 'Internet banking — select your bank at checkout' },
    { id: 'EWALLET',  label: 'e-Wallet',             abbr: 'eW',  description: 'Touch \'n Go, Boost, or ShopeePay' },
  ],
  ID: [
    { id: 'VIRTUAL_ACCOUNT', label: 'Bank Transfer (VA)', abbr: 'VA',  description: 'BCA, BNI, BRI, Mandiri, or Permata virtual account' },
    { id: 'QRIS',            label: 'QRIS',               abbr: 'QR',  description: 'Scan with GoPay, OVO, Dana, or any QRIS-supported app' },
    { id: 'GOPAY',           label: 'GoPay',              abbr: 'GP',  description: 'Pay via the Gojek app' },
  ],
  PH: [
    { id: 'GCASH',    label: 'GCash',         abbr: 'GC',  description: 'Pay via GCash mobile wallet' },
    { id: 'MAYA',     label: 'Maya',          abbr: 'MY',  description: 'Pay via Maya (formerly PayMaya)' },
    { id: 'GRABPAY',  label: 'GrabPay',       abbr: 'GP',  description: 'Pay via the Grab app' },
  ],
};

// ── Declarations per region ───────────────────────────────────────────────────

const DECLARATIONS_BY_REGION: Record<string, { body: string; regulator: string }> = {
  MY: {
    regulator: 'Bank Negara Malaysia (BNM)',
    body: 'as required under the Financial Services Act 2013',
  },
  ID: {
    regulator: 'Otoritas Jasa Keuangan (OJK)',
    body: 'sesuai dengan Undang-Undang No. 40 Tahun 2014 tentang Perasuransian',
  },
  PH: {
    regulator: 'Insurance Commission of the Philippines',
    body: 'as required under the Insurance Code of the Philippines (PD 1460)',
  },
};

function getDeclarations(region: string): string[] {
  const { body, regulator } = DECLARATIONS_BY_REGION[region] ?? DECLARATIONS_BY_REGION.MY;
  return [
    'I declare that all information provided is true, accurate, and complete to the best of my knowledge.',
    `I acknowledge my duty of disclosure ${body} and confirm I have not withheld any material facts that may affect this insurance.`,
    'I have read and understood the product terms, conditions, exclusions, and any applicable waiting periods.',
    `I confirm that no previous insurance applications have been declined or policies cancelled in the past 3 years, and I consent to ${regulator} oversight of this product.`,
  ];
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Personal {
  name: string; nationalId: string; dob: string; gender: string;
  phone: string; email: string; occupation: string; maritalStatus: string;
}

interface Coverage {
  sumInsured?: string; smoker?: string;
  beneficiaryName?: string; beneficiaryRelation?: string;
  preExisting?: string; preExistingDetails?: string;
  height?: string; weight?: string;
  vehicleReg?: string; vehicleMake?: string; vehicleModel?: string;
  vehicleYear?: string; engineCC?: string; ncd?: string;
  destination?: string; departDate?: string; returnDate?: string;
  passportNo?: string; travellers?: string; tripPurpose?: string;
  occupationalClass?: string; paSumInsured?: string;
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const inputStyle = { borderRadius: 8, borderColor: '#E5E7EB', fontSize: 14, height: 40 };
const selectStyle = { width: '100%', height: 40 };

function FieldLabel({ children, required }: { children: string; required?: boolean }) {
  return (
    <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginBottom: 6 }}>
      {children}{required && <span style={{ color: '#EF4444', marginLeft: 3 }}>*</span>}
    </div>
  );
}

function FieldGroup({ children, half }: { children: React.ReactNode; half?: boolean }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: half ? '1fr 1fr' : '1fr', gap: 16 }}>
      {children}
    </div>
  );
}

// ── Step 0: Personal Info ─────────────────────────────────────────────────────

const ID_CONFIG: Record<string, { label: string; placeholder: string; phonePlaceholder: string }> = {
  MY: { label: 'NRIC No.',                  placeholder: '000000-00-0000',                 phonePlaceholder: '+601X-XXXXXXX' },
  ID: { label: 'NIK (Nomor Induk)',          placeholder: '16-digit national ID number',    phonePlaceholder: '+628XX-XXXX-XXXX' },
  PH: { label: 'PhilSys / Passport No.',    placeholder: 'e.g. PSN-1234-5678 or XX1234567', phonePlaceholder: '+639XX-XXX-XXXX' },
};

function PersonalStep({
  region, data, onChange,
}: { region: string; data: Personal; onChange: (d: Personal) => void }) {
  const idCfg = ID_CONFIG[region] ?? ID_CONFIG.MY;

  function set(key: keyof Personal, val: string) {
    const next = { ...data, [key]: val };
    if (key === 'nationalId' && region === 'MY') {
      const fmt = formatNRIC(val);
      next.nationalId = fmt;
      const parsed = parseNRIC(fmt);
      next.dob    = parsed?.dob    ?? '';
      next.gender = parsed?.gender ?? '';
    }
    onChange(next);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div>
        <FieldLabel required>Full Name (as per national ID)</FieldLabel>
        <Input
          value={data.name} onChange={e => set('name', e.target.value)}
          placeholder={region === 'ID' ? 'e.g. Budi Santoso' : region === 'PH' ? 'e.g. Maria Santos' : 'e.g. Ahmad Razif bin Ismail'}
          style={inputStyle}
        />
      </div>

      <div>
        <FieldLabel required>{idCfg.label}</FieldLabel>
        <Input
          value={data.nationalId}
          onChange={e => set('nationalId', region === 'MY' ? formatNRIC(e.target.value) : e.target.value)}
          placeholder={idCfg.placeholder}
          maxLength={region === 'MY' ? 14 : region === 'ID' ? 16 : 30}
          style={inputStyle}
        />
        {region === 'MY' && data.dob && (
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            <span style={{ fontSize: 12, background: '#F3F4F6', borderRadius: 999, padding: '3px 12px', color: '#6B7280', fontWeight: 500 }}>
              DOB: {data.dob}
            </span>
            <span style={{ fontSize: 12, background: '#F3F4F6', borderRadius: 999, padding: '3px 12px', color: '#6B7280', fontWeight: 500 }}>
              {data.gender}
            </span>
          </div>
        )}
      </div>

      <FieldGroup half>
        <div>
          <FieldLabel required>Mobile Number</FieldLabel>
          <Input
            value={data.phone} onChange={e => set('phone', e.target.value)}
            placeholder={idCfg.phonePlaceholder} style={inputStyle}
          />
        </div>
        <div>
          <FieldLabel required>Email Address</FieldLabel>
          <Input
            value={data.email} onChange={e => set('email', e.target.value)}
            placeholder="you@example.com" style={inputStyle}
          />
        </div>
      </FieldGroup>

      <FieldGroup half>
        <div>
          <FieldLabel required>Occupation</FieldLabel>
          <Input
            value={data.occupation} onChange={e => set('occupation', e.target.value)}
            placeholder="e.g. Software Engineer" style={inputStyle}
          />
        </div>
        <div>
          <FieldLabel required>Marital Status</FieldLabel>
          <Select
            value={data.maritalStatus || undefined} onChange={v => set('maritalStatus', v)}
            placeholder="Select" style={selectStyle}
            options={[
              { label: 'Single', value: 'Single' },
              { label: 'Married', value: 'Married' },
              { label: 'Divorced', value: 'Divorced' },
              { label: 'Widowed', value: 'Widowed' },
            ]}
          />
        </div>
      </FieldGroup>
    </div>
  );
}

function validatePersonal(region: string, p: Personal): boolean {
  const idDigits = p.nationalId.replace(/\D/g, '');
  const idOk = region === 'MY' ? idDigits.length === 12
             : region === 'ID' ? idDigits.length === 16
             : p.nationalId.trim().length >= 6;
  return !!(p.name && idOk && p.phone && p.email && p.occupation && p.maritalStatus);
}

// ── Step 1: Coverage (product-specific) ───────────────────────────────────────

function LifeFields({ data, set }: { data: Coverage; set: (k: keyof Coverage, v: string) => void }) {
  return (
    <>
      <FieldGroup half>
        <div>
          <FieldLabel required>Sum Insured</FieldLabel>
          <Select
            value={data.sumInsured || undefined} onChange={v => set('sumInsured', v)}
            placeholder="Select coverage amount" style={selectStyle}
            options={[
              { label: 'MYR 100,000 / IDR 300M / PHP 3M', value: '100000' },
              { label: 'MYR 250,000 / IDR 750M / PHP 7.5M', value: '250000' },
              { label: 'MYR 500,000 / IDR 1.5B / PHP 15M', value: '500000' },
              { label: 'MYR 1,000,000 / IDR 3B / PHP 30M', value: '1000000' },
            ]}
          />
        </div>
        <div>
          <FieldLabel required>Smoker Status</FieldLabel>
          <Select
            value={data.smoker || undefined} onChange={v => set('smoker', v)}
            placeholder="Select" style={selectStyle}
            options={[{ label: 'Non-smoker', value: 'No' }, { label: 'Smoker', value: 'Yes' }]}
          />
          {data.smoker === 'Yes' && (
            <div style={{ fontSize: 11, color: '#92400E', background: '#FFFBEB', borderRadius: 6, padding: '5px 10px', marginTop: 6 }}>
              Smoker surcharge of 15% will apply.
            </div>
          )}
        </div>
      </FieldGroup>

      <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginTop: 4 }}>
        Beneficiary
      </div>
      <FieldGroup half>
        <div>
          <FieldLabel required>Beneficiary Full Name</FieldLabel>
          <Input value={data.beneficiaryName || ''} onChange={e => set('beneficiaryName', e.target.value)} placeholder="Full name" style={inputStyle} />
        </div>
        <div>
          <FieldLabel required>Relationship to You</FieldLabel>
          <Select
            value={data.beneficiaryRelation || undefined} onChange={v => set('beneficiaryRelation', v)}
            placeholder="Select" style={selectStyle}
            options={['Spouse', 'Child', 'Parent', 'Sibling', 'Other'].map(r => ({ label: r, value: r }))}
          />
        </div>
      </FieldGroup>
    </>
  );
}

function MedicalFields({ data, set }: { data: Coverage; set: (k: keyof Coverage, v: string) => void }) {
  return (
    <>
      <FieldGroup half>
        <div>
          <FieldLabel required>Pre-existing Conditions?</FieldLabel>
          <Select
            value={data.preExisting || undefined} onChange={v => set('preExisting', v)}
            placeholder="Select" style={selectStyle}
            options={[{ label: 'No', value: 'No' }, { label: 'Yes', value: 'Yes' }]}
          />
        </div>
        <div>
          <FieldLabel required>Smoker Status</FieldLabel>
          <Select
            value={data.smoker || undefined} onChange={v => set('smoker', v)}
            placeholder="Select" style={selectStyle}
            options={[{ label: 'Non-smoker', value: 'No' }, { label: 'Smoker', value: 'Yes' }]}
          />
        </div>
      </FieldGroup>
      {data.preExisting === 'Yes' && (
        <div>
          <FieldLabel>Please describe your condition(s)</FieldLabel>
          <Input.TextArea
            value={data.preExistingDetails || ''} onChange={e => set('preExistingDetails', e.target.value)}
            placeholder="e.g. Hypertension, Diabetes Type 2" rows={2}
            style={{ borderRadius: 8, fontSize: 14 }}
          />
          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 5 }}>
            Pre-existing conditions are subject to a 5-year waiting period.
          </div>
        </div>
      )}
      <FieldGroup half>
        <div>
          <FieldLabel>Height (cm)</FieldLabel>
          <Input value={data.height || ''} onChange={e => set('height', e.target.value)} placeholder="e.g. 170" style={inputStyle} type="number" />
        </div>
        <div>
          <FieldLabel>Weight (kg)</FieldLabel>
          <Input value={data.weight || ''} onChange={e => set('weight', e.target.value)} placeholder="e.g. 68" style={inputStyle} type="number" />
        </div>
      </FieldGroup>
    </>
  );
}

function MotorFields({ region, data, set }: { region: string; data: Coverage; set: (k: keyof Coverage, v: string) => void }) {
  const years = Array.from({ length: 15 }, (_, i) => { const y = 2025 - i; return { label: String(y), value: String(y) }; });
  const ncdLabel = region === 'ID' ? 'No Claim Bonus (NCB) %' : 'No Claims Discount (NCD) %';
  return (
    <>
      <FieldGroup half>
        <div>
          <FieldLabel required>Vehicle Registration No.</FieldLabel>
          <Input
            value={data.vehicleReg || ''} onChange={e => set('vehicleReg', e.target.value.toUpperCase())}
            placeholder={region === 'ID' ? 'e.g. B 1234 ABC' : region === 'PH' ? 'e.g. ABC 1234' : 'e.g. WBB 1234'}
            style={inputStyle}
          />
        </div>
        <div>
          <FieldLabel required>Year of Manufacture</FieldLabel>
          <Select value={data.vehicleYear || undefined} onChange={v => set('vehicleYear', v)} placeholder="Select year" style={selectStyle} options={years} />
        </div>
      </FieldGroup>
      <FieldGroup half>
        <div>
          <FieldLabel required>Vehicle Make</FieldLabel>
          <Input
            value={data.vehicleMake || ''} onChange={e => set('vehicleMake', e.target.value)}
            placeholder={region === 'ID' ? 'e.g. Toyota' : region === 'PH' ? 'e.g. Toyota' : 'e.g. Perodua'}
            style={inputStyle}
          />
        </div>
        <div>
          <FieldLabel required>Vehicle Model</FieldLabel>
          <Input
            value={data.vehicleModel || ''} onChange={e => set('vehicleModel', e.target.value)}
            placeholder={region === 'ID' ? 'e.g. Avanza 1.3 G' : region === 'PH' ? 'e.g. Vios 1.3 E' : 'e.g. Myvi 1.5 AV'}
            style={inputStyle}
          />
        </div>
      </FieldGroup>
      <FieldGroup half>
        <div>
          <FieldLabel required>Engine Capacity</FieldLabel>
          <Select
            value={data.engineCC || undefined} onChange={v => set('engineCC', v)}
            placeholder="Select" style={selectStyle}
            options={[
              { label: 'Up to 1,000 cc', value: '1000' },
              { label: '1,001 – 1,300 cc', value: '1300' },
              { label: '1,301 – 1,600 cc', value: '1600' },
              { label: '1,601 – 2,000 cc', value: '2000' },
              { label: 'Above 2,000 cc', value: '2001' },
            ]}
          />
        </div>
        <div>
          <FieldLabel required>{ncdLabel}</FieldLabel>
          <Select
            value={data.ncd || undefined} onChange={v => set('ncd', v)}
            placeholder="Select" style={selectStyle}
            options={[
              { label: '0% (New / Claim Made)', value: '0' },
              { label: '25% (1 year claim-free)', value: '25' },
              { label: '30% (2 years)', value: '30' },
              { label: '38.33% (3 years)', value: '38.33' },
              { label: '45% (4 years)', value: '45' },
              { label: '55% (5+ years)', value: '55' },
            ]}
          />
        </div>
      </FieldGroup>
      {data.ncd && data.ncd !== '0' && (
        <div style={{ fontSize: 11, color: '#166534', background: '#F0FDF4', borderRadius: 6, padding: '5px 10px' }}>
          {ncdLabel} of {data.ncd}% will be verified against road transport authority records at policy issuance.
        </div>
      )}
    </>
  );
}

function TravelFields({ data, set }: { data: Coverage; set: (k: keyof Coverage, v: string) => void }) {
  return (
    <>
      <FieldGroup half>
        <div>
          <FieldLabel required>Destination Country</FieldLabel>
          <Input value={data.destination || ''} onChange={e => set('destination', e.target.value)} placeholder="e.g. Japan" style={inputStyle} />
        </div>
        <div>
          <FieldLabel required>Passport Number</FieldLabel>
          <Input value={data.passportNo || ''} onChange={e => set('passportNo', e.target.value.toUpperCase())} placeholder="e.g. A12345678" style={inputStyle} />
        </div>
      </FieldGroup>
      <FieldGroup half>
        <div>
          <FieldLabel required>Departure Date</FieldLabel>
          <Input value={data.departDate || ''} onChange={e => set('departDate', e.target.value)} type="date" style={inputStyle} />
        </div>
        <div>
          <FieldLabel required>Return Date</FieldLabel>
          <Input value={data.returnDate || ''} onChange={e => set('returnDate', e.target.value)} type="date" style={inputStyle} />
        </div>
      </FieldGroup>
      <FieldGroup half>
        <div>
          <FieldLabel required>No. of Travellers</FieldLabel>
          <Select
            value={data.travellers || undefined} onChange={v => set('travellers', v)}
            placeholder="Select" style={selectStyle}
            options={[1, 2, 3, 4, 5].map(n => ({ label: `${n} traveller${n > 1 ? 's' : ''}`, value: String(n) }))}
          />
        </div>
        <div>
          <FieldLabel required>Purpose of Travel</FieldLabel>
          <Select
            value={data.tripPurpose || undefined} onChange={v => set('tripPurpose', v)}
            placeholder="Select" style={selectStyle}
            options={[
              { label: 'Leisure / Holiday', value: 'Leisure' },
              { label: 'Business', value: 'Business' },
              { label: 'Education', value: 'Education' },
              { label: 'Medical Treatment', value: 'Medical' },
            ]}
          />
        </div>
      </FieldGroup>
    </>
  );
}

function AccidentFields({ data, set }: { data: Coverage; set: (k: keyof Coverage, v: string) => void }) {
  return (
    <FieldGroup half>
      <div>
        <FieldLabel required>Occupational Class</FieldLabel>
        <Select
          value={data.occupationalClass || undefined} onChange={v => set('occupationalClass', v)}
          placeholder="Select" style={selectStyle}
          options={[
            { label: 'Class 1 — Professional / Administrative', value: 'Class 1' },
            { label: 'Class 2 — Skilled Trade / Supervisory', value: 'Class 2' },
            { label: 'Class 3 — Manual / Field Operations', value: 'Class 3' },
          ]}
        />
        {data.occupationalClass && (
          <div style={{ fontSize: 11, color: '#6B7280', marginTop: 5 }}>
            {data.occupationalClass === 'Class 1' && 'Office-based professionals and administrators.'}
            {data.occupationalClass === 'Class 2' && 'Skilled tradespeople and light outdoor work.'}
            {data.occupationalClass === 'Class 3' && 'Manual labour and high-risk field operations.'}
          </div>
        )}
      </div>
      <div>
        <FieldLabel required>Sum Insured</FieldLabel>
        <Select
          value={data.paSumInsured || undefined} onChange={v => set('paSumInsured', v)}
          placeholder="Select" style={selectStyle}
          options={[
            { label: 'MYR 50,000 / IDR 150M / PHP 1.5M', value: '50000' },
            { label: 'MYR 100,000 / IDR 300M / PHP 3M', value: '100000' },
            { label: 'MYR 250,000 / IDR 750M / PHP 7.5M', value: '250000' },
            { label: 'MYR 500,000 / IDR 1.5B / PHP 15M', value: '500000' },
          ]}
        />
      </div>
    </FieldGroup>
  );
}

function CoverageStep({ product, data, onChange }: { product: StoreProduct; data: Coverage; onChange: (d: Coverage) => void }) {
  function set(key: keyof Coverage, val: string) { onChange({ ...data, [key]: val }); }
  const base = product.code.replace(/_id$|_ph$/, '');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      {base === 'life'     && <LifeFields     data={data} set={set} />}
      {base === 'medical'  && <MedicalFields  data={data} set={set} />}
      {base === 'motor'    && <MotorFields    region={product.region} data={data} set={set} />}
      {base === 'travel'   && <TravelFields   data={data} set={set} />}
      {base === 'accident' && <AccidentFields data={data} set={set} />}
    </div>
  );
}

function validateCoverage(code: string, c: Coverage): boolean {
  const base = code.replace(/_id$|_ph$/, '');
  if (base === 'life')     return !!(c.sumInsured && c.smoker && c.beneficiaryName && c.beneficiaryRelation);
  if (base === 'medical')  return !!(c.preExisting && c.smoker);
  if (base === 'motor')    return !!(c.vehicleReg && c.vehicleMake && c.vehicleModel && c.vehicleYear && c.engineCC && c.ncd);
  if (base === 'travel')   return !!(c.destination && c.departDate && c.returnDate && c.passportNo && c.travellers && c.tripPurpose);
  if (base === 'accident') return !!(c.occupationalClass && c.paSumInsured);
  return true;
}

// ── Step 2: Declaration ───────────────────────────────────────────────────────

function DeclarationStep({ region, checked, onChange }: { region: string; checked: boolean[]; onChange: (i: number, v: boolean) => void }) {
  const declarations = getDeclarations(region);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 20, lineHeight: 1.6 }}>
        Please read and confirm each declaration carefully before proceeding with your application.
      </div>
      {declarations.map((text, i) => (
        <div
          key={i}
          onClick={() => onChange(i, !checked[i])}
          style={{
            display: 'flex', alignItems: 'flex-start', gap: 14,
            padding: '14px 16px', borderRadius: 10, cursor: 'pointer',
            background: checked[i] ? '#F0FDF4' : '#FAFAFA',
            border: `1px solid ${checked[i] ? '#BBF7D0' : '#E5E7EB'}`,
            marginBottom: 10, transition: 'background 0.15s, border-color 0.15s',
          }}
        >
          <Checkbox
            checked={checked[i]}
            onChange={e => { e.stopPropagation(); onChange(i, e.target.checked); }}
            style={{ marginTop: 2, flexShrink: 0 }}
          />
          <span style={{ fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{text}</span>
        </div>
      ))}
    </div>
  );
}

// ── Step 3: Review & Payment ──────────────────────────────────────────────────

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
      <span style={{ fontSize: 12, color: '#9CA3AF', flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 13, color: '#111827', fontWeight: 500, textAlign: 'right' }}>{value}</span>
    </div>
  );
}

function MethodRow({ method, selected, onSelect }: { method: MethodOption; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button" onClick={onSelect}
      style={{
        width: '100%', border: selected ? '1.5px solid #FCB900' : '1px solid #E5E7EB',
        borderRadius: 10, padding: '12px 16px', cursor: 'pointer',
        background: selected ? '#FFFBEB' : 'white',
        display: 'flex', alignItems: 'center', gap: 14,
        textAlign: 'left', outline: 'none',
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 8, flexShrink: 0,
        background: selected ? '#FCB900' : '#F3F4F6',
        color: selected ? '#111827' : '#6B7280',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 11, fontWeight: 700,
      }}>{method.abbr}</div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: '#111827' }}>{method.label}</div>
        {selected && <div style={{ fontSize: 12, color: '#6B7280', marginTop: 2 }}>{method.description}</div>}
      </div>
      <div style={{
        width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
        border: selected ? '5px solid #FCB900' : '1.5px solid #D1D5DB', background: 'white',
      }} />
    </button>
  );
}

function PaymentStep({
  product, personal, coverage, selectedMethod, onSelectMethod,
}: {
  product: StoreProduct; personal: Personal; coverage: Coverage;
  selectedMethod: string; onSelectMethod: (id: string) => void;
}) {
  const base = product.code.replace(/_id$|_ph$/, '');
  const coverageRows: { label: string; value: string }[] = [];

  if (base === 'life') {
    if (coverage.sumInsured)       coverageRows.push({ label: 'Sum Insured',  value: `${parseInt(coverage.sumInsured).toLocaleString()}` });
    if (coverage.smoker)           coverageRows.push({ label: 'Smoker',       value: coverage.smoker === 'Yes' ? 'Yes (+15%)' : 'Non-smoker' });
    if (coverage.beneficiaryName)  coverageRows.push({ label: 'Beneficiary',  value: `${coverage.beneficiaryName} (${coverage.beneficiaryRelation})` });
  }
  if (base === 'medical') {
    if (coverage.preExisting) coverageRows.push({ label: 'Pre-existing', value: coverage.preExisting === 'Yes' ? 'Yes — waiting period applies' : 'None declared' });
    if (coverage.smoker)      coverageRows.push({ label: 'Smoker',       value: coverage.smoker === 'Yes' ? 'Yes' : 'Non-smoker' });
    if (coverage.height && coverage.weight) coverageRows.push({ label: 'BMI Info', value: `${coverage.height} cm / ${coverage.weight} kg` });
  }
  if (base === 'motor') {
    if (coverage.vehicleReg) coverageRows.push({ label: 'Vehicle', value: `${coverage.vehicleReg} · ${coverage.vehicleYear} ${coverage.vehicleMake} ${coverage.vehicleModel}` });
    if (coverage.ncd)        coverageRows.push({ label: 'NCD/NCB', value: `${coverage.ncd}% discount` });
  }
  if (base === 'travel') {
    if (coverage.destination) coverageRows.push({ label: 'Destination', value: coverage.destination });
    if (coverage.departDate && coverage.returnDate) coverageRows.push({ label: 'Dates', value: `${coverage.departDate} → ${coverage.returnDate}` });
    if (coverage.travellers)  coverageRows.push({ label: 'Travellers', value: coverage.travellers });
  }
  if (base === 'accident') {
    if (coverage.occupationalClass) coverageRows.push({ label: 'Occupation', value: coverage.occupationalClass });
    if (coverage.paSumInsured)      coverageRows.push({ label: 'Sum Insured', value: `${parseInt(coverage.paSumInsured).toLocaleString()}` });
  }

  const methods = METHODS_BY_REGION[product.region] ?? METHODS_BY_REGION.MY;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ background: '#FAFAFA', border: '1px solid #F0F0F0', borderRadius: 10, padding: '18px 20px' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 12 }}>
          Application Summary
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <SummaryRow label="Plan"         value={product.name} />
          <SummaryRow label="Policyholder" value={personal.name} />
          <SummaryRow label="National ID"  value={personal.nationalId} />
          <SummaryRow label="Contact"      value={personal.phone} />
          <SummaryRow label="Email"        value={personal.email} />
          {coverageRows.map(r => <SummaryRow key={r.label} label={r.label} value={r.value} />)}
        </div>
        <Divider style={{ margin: '14px 0', borderColor: '#E5E7EB' }} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
          <span style={{ fontSize: 12, color: '#9CA3AF' }}>Premium Due</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: '#FCB900' }}>
            {formatAmount(product.amount, product.currency)}
            <span style={{ fontSize: 12, fontWeight: 400, color: '#9CA3AF', marginLeft: 4 }}>/ {product.billingPeriod}</span>
          </span>
        </div>
      </div>

      <div>
        <div style={{ fontSize: 11, fontWeight: 600, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 10 }}>
          Payment Method
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {methods.map(m => (
            <MethodRow key={m.id} method={m} selected={selectedMethod === m.id} onSelect={() => onSelectMethod(m.id)} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

const STEP_LABELS = ['Personal Info', 'Coverage Details', 'Declaration', 'Review & Quote'];

export default function CheckoutPage() {
  const { state } = useLocation();
  const navigate  = useNavigate();

  const product: StoreProduct | undefined = (state as { product?: StoreProduct })?.product;

  const defaultMethod = (METHODS_BY_REGION[product?.region ?? 'MY'] ?? METHODS_BY_REGION.MY)[0].id;

  const [step, setStep]             = useState(0);
  const [personal, setPersonal]     = useState<Personal>({ name: '', nationalId: '', dob: '', gender: '', phone: '', email: '', occupation: '', maritalStatus: '' });
  const [coverage, setCoverage]     = useState<Coverage>({});
  const [declarations, setDeclarations] = useState([false, false, false, false]);
  const [paymentMethod, setPaymentMethod] = useState(defaultMethod);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [quoteSubmitted, setQuoteSubmitted] = useState(false);
  const [quoteRef, setQuoteRef]     = useState('');

  if (!product) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <Text type="secondary">No product selected.</Text>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/buy')}>Browse Plans</Button>
      </div>
    );
  }

  if (quoteSubmitted) {
    return (
      <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: 'white', borderRadius: 20, padding: '48px 40px', maxWidth: 440, width: '100%', textAlign: 'center', boxShadow: '0 8px 40px rgba(0,0,0,0.09)' }}>
          <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#FFF9E6', border: '2px solid #FCB900', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
            <MailOutlined style={{ fontSize: 32, color: '#FCB900' }} />
          </div>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 10 }}>Check Your Email</div>
          <div style={{ fontSize: 14, color: '#6B7280', lineHeight: 1.75, marginBottom: 24 }}>
            We've sent a payment link to<br />
            <strong style={{ color: '#111827' }}>{personal.email}</strong>
            <br /><br />
            Open it to complete your <strong>{product.insuranceType}</strong> policy purchase.
            No need to re-enter your details — everything is saved.
          </div>
          <div style={{ background: '#FFF9E6', border: '1px solid #FDE68A', borderRadius: 10, padding: '14px 18px', marginBottom: 10, textAlign: 'left' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#B45309', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>Quote Reference</div>
            <div style={{ fontSize: 16, fontWeight: 800, fontFamily: 'monospace', color: '#78350F' }}>{quoteRef}</div>
          </div>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 28 }}>
            Quote valid for 7 days · Check your spam folder if you don't see the email
          </div>
          <Button
            type="primary" block size="large"
            onClick={() => navigate('/buy')}
            style={{ height: 46, borderRadius: 10, fontWeight: 700, background: '#FCB900', borderColor: '#FCB900', color: '#111827' }}
          >
            Back to Plans
          </Button>
        </div>
      </div>
    );
  }

  function toggleDeclaration(i: number, v: boolean) {
    const next = [...declarations]; next[i] = v; setDeclarations(next);
  }

  function canAdvance(): boolean {
    if (step === 0) return validatePersonal(product!.region, personal);
    if (step === 1) return validateCoverage(product!.code, coverage);
    if (step === 2) return declarations.every(Boolean);
    return true;
  }

  async function handleGetQuote() {
    setLoading(true); setError(null);
    try {
      const res = await storeService.createQuote({
        holderName:    personal.name,
        holderEmail:   personal.email,
        insuranceType: product!.insuranceType,
        amount:        product!.amount,
        paymentMethod,
        region:        product!.region,
        currency:      product!.currency,
        appBaseUrl:    window.location.origin,
      });
      setQuoteRef(res.quoteReference);
      setQuoteSubmitted(true);
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        ?? 'Something went wrong. Please try again.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  const initials = product.insuranceType.slice(0, 2).toUpperCase();

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', flexDirection: 'column' }}>

      {/* Topbar */}
      <div style={{
        background: 'white', borderBottom: '1px solid #E5E7EB',
        height: 60, padding: '0 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 32, height: 32, borderRadius: 7, background: '#FCB900', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, color: '#111827' }}>IR</div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>InsureRoute</div>
            <div style={{ fontSize: 10, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Secure Application</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <LockOutlined style={{ color: '#9CA3AF', fontSize: 12 }} />
          <Text style={{ fontSize: 12, color: '#9CA3AF' }}>256-bit SSL</Text>
          <Divider type="vertical" style={{ margin: '0 6px', borderColor: '#E5E7EB' }} />
          <Button type="link" icon={<ArrowLeftOutlined />} onClick={() => navigate('/buy')} style={{ color: '#6B7280', padding: 0, fontSize: 13 }}>
            Plans
          </Button>
        </div>
      </div>

      {/* Body */}
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', padding: '36px 24px 60px' }}>
        <div style={{ width: '100%', maxWidth: 660 }}>

          {/* Plan pill */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 10, marginBottom: 24, background: 'white', border: '1px solid #E5E7EB', borderRadius: 10, padding: '8px 16px 8px 10px' }}>
            <div style={{ width: 30, height: 30, borderRadius: 7, background: '#FCB900', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, color: '#111827' }}>
              {initials}
            </div>
            <div>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{product.name}</div>
              <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                {formatAmount(product.amount, product.currency)} / {product.billingPeriod}
              </div>
            </div>
          </div>

          {/* Step indicator */}
          <div style={{ marginBottom: 28 }}>
            <Steps current={step} size="small" items={STEP_LABELS.map(title => ({ title }))} />
          </div>

          {/* Card */}
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #F0F0F0', boxShadow: '0 2px 16px rgba(0,0,0,0.05)', padding: '32px 36px' }}>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 4 }}>
                {['Personal Information', 'Coverage Details', 'Declaration & Disclosure', 'Review & Get Quote'][step]}
              </div>
              <div style={{ fontSize: 13, color: '#9CA3AF' }}>
                {step === 0 && 'Enter your personal details as per your national identification document.'}
                {step === 1 && `Tell us more about your ${product.insuranceType.toLowerCase()} coverage needs.`}
                {step === 2 && 'Please read and confirm each statement carefully before proceeding.'}
                {step === 3 && 'Review your application summary. A payment link will be sent to your email.'}
              </div>
            </div>

            {step === 0 && <PersonalStep region={product.region} data={personal} onChange={setPersonal} />}
            {step === 1 && <CoverageStep product={product} data={coverage} onChange={setCoverage} />}
            {step === 2 && <DeclarationStep region={product.region} checked={declarations} onChange={toggleDeclaration} />}
            {step === 3 && (
              <PaymentStep
                product={product} personal={personal} coverage={coverage}
                selectedMethod={paymentMethod} onSelectMethod={setPaymentMethod}
              />
            )}

            {step === 2 && !declarations.every(Boolean) && (
              <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 12 }}>All four declarations must be confirmed to continue.</div>
            )}

            {error && step === 3 && (
              <Alert type="error" message={error} showIcon style={{ borderRadius: 8, marginTop: 16 }} />
            )}

            {/* Navigation */}
            <div style={{ display: 'flex', gap: 10, marginTop: 28 }}>
              {step > 0 && (
                <Button
                  size="large" onClick={() => setStep(s => s - 1)}
                  icon={<ArrowLeftOutlined />}
                  style={{ height: 46, borderRadius: 10, fontWeight: 600, borderColor: '#E5E7EB', color: '#6B7280' }}
                >
                  Back
                </Button>
              )}

              {step < 3 ? (
                <Button
                  type="primary" size="large" block
                  disabled={!canAdvance()} onClick={() => setStep(s => s + 1)}
                  style={{
                    height: 46, borderRadius: 10, fontWeight: 700, fontSize: 14,
                    background: canAdvance() ? '#FCB900' : undefined,
                    borderColor: canAdvance() ? '#FCB900' : undefined,
                    color: canAdvance() ? '#111827' : undefined,
                  }}
                >
                  Continue
                </Button>
              ) : (
                <Button
                  type="primary" size="large" block loading={loading}
                  onClick={handleGetQuote}
                  icon={!loading ? <MailOutlined /> : undefined}
                  style={{ height: 46, borderRadius: 10, fontWeight: 700, fontSize: 14, background: '#FCB900', borderColor: '#FCB900', color: '#111827', boxShadow: '0 2px 12px rgba(252,185,0,0.28)' }}
                >
                  {loading ? 'Saving quote…' : 'Get My Quote — Email Payment Link'}
                </Button>
              )}
            </div>
          </div>

          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <Text style={{ fontSize: 12, color: '#9CA3AF' }}>
              <LockOutlined style={{ marginRight: 5 }} />
              Secured by InsureRoute · {DECLARATIONS_BY_REGION[product.region]?.regulator ?? 'Bank Negara Malaysia (BNM)'}
            </Text>
          </div>
        </div>
      </div>
    </div>
  );
}
