import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Divider, Dropdown, Select, Spin, Tag, Typography } from 'antd';
import {
  LockOutlined, CheckOutlined, HeartOutlined, MedicineBoxOutlined,
  CarOutlined, CompassOutlined, SafetyOutlined, ThunderboltOutlined,
  CheckCircleOutlined, AuditOutlined, RightOutlined, DownOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { storeService, type StoreProduct } from './services/storeService';

const { Text } = Typography;

// ── Region config ─────────────────────────────────────────────────────────────

const REGIONS = [
  { code: 'MY', label: 'Malaysia',    flag: '🇲🇾', regulator: 'Bank Negara Malaysia' },
  { code: 'ID', label: 'Indonesia',   flag: '🇮🇩', regulator: 'Otoritas Jasa Keuangan (OJK)' },
  { code: 'PH', label: 'Philippines', flag: '🇵🇭', regulator: 'Insurance Commission Philippines' },
] as const;

type RegionCode = 'MY' | 'ID' | 'PH';

// ── Category config ───────────────────────────────────────────────────────────

const CATEGORY_KEYS: Record<string, string> = {
  'Life Insurance':    'Life',
  'Medical Insurance': 'Medical',
  'Motor Insurance':   'Motor',
  'Travel Insurance':  'Travel',
  'Personal Accident': 'Accident',
};

interface TypeMeta { icon: React.ReactNode; color: string; iconBg: string }

const TYPE_META: Record<string, TypeMeta> = {
  'Life Insurance':    { icon: <HeartOutlined />,        color: '#1D4ED8', iconBg: '#DBEAFE' },
  'Medical Insurance': { icon: <MedicineBoxOutlined />,  color: '#059669', iconBg: '#D1FAE5' },
  'Motor Insurance':   { icon: <CarOutlined />,          color: '#7C3AED', iconBg: '#EDE9FE' },
  'Travel Insurance':  { icon: <CompassOutlined />,      color: '#D97706', iconBg: '#FDE68A' },
  'Personal Accident': { icon: <SafetyOutlined />,       color: '#DC2626', iconBg: '#FEE2E2' },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAmount(amount: number, currency: string): string {
  if (currency === 'IDR') return `IDR ${amount.toLocaleString('id-ID')}`;
  return `${currency} ${Number(amount).toFixed(2)}`;
}

// ── Navbar ────────────────────────────────────────────────────────────────────

const CATEGORY_ITEMS = [
  { key: 'all',      label: 'All Plans' },
  { key: 'Life',     label: 'Life Insurance' },
  { key: 'Medical',  label: 'Medical Insurance' },
  { key: 'Motor',    label: 'Motor Insurance' },
  { key: 'Travel',   label: 'Travel Insurance' },
  { key: 'Accident', label: 'Personal Accident' },
];

function Navbar({
  region, onRegionChange, category, onCategoryChange,
}: {
  region: RegionCode; onRegionChange: (r: RegionCode) => void;
  category: string;   onCategoryChange: (c: string) => void;
}) {
  const activeCategoryLabel = CATEGORY_ITEMS.find(c => c.key === category)?.label ?? 'Products';

  return (
    <div style={{
      position: 'sticky', top: 0, zIndex: 100,
      background: 'white', borderBottom: '1px solid #E5E7EB',
      padding: '0 48px', height: 64,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    }}>
      {/* Brand */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 34, height: 34, borderRadius: 8, background: '#FCB900',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 900, fontSize: 13, color: '#111827',
        }}>IR</div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#111827', lineHeight: 1.1 }}>InsureRoute</div>
          <div style={{ fontSize: 9, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.12em' }}>Insurance Marketplace</div>
        </div>
      </div>

      {/* Nav links */}
      <nav style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
        <Dropdown
          trigger={['click']}
          menu={{
            items: CATEGORY_ITEMS.map(c => ({
              key: c.key,
              label: c.label,
              style: category === c.key
                ? { color: '#D97706', fontWeight: 700, background: '#FFFBEB' }
                : {},
            })),
            onClick: ({ key }) => onCategoryChange(key),
          }}
        >
          <span style={{
            fontSize: 14, fontWeight: category !== 'all' ? 700 : 500,
            color: category !== 'all' ? '#D97706' : '#374151',
            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5,
            userSelect: 'none',
          }}>
            {activeCategoryLabel}
            <DownOutlined style={{ fontSize: 10 }} />
          </span>
        </Dropdown>

        {['Claims', 'Support', 'About'].map(link => (
          <span key={link} style={{ fontSize: 14, color: '#374151', cursor: 'default', fontWeight: 500 }}>
            {link}
          </span>
        ))}
      </nav>

      {/* Right: region selector + SSL */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <Select
          value={region}
          onChange={(val: RegionCode) => onRegionChange(val)}
          style={{ width: 170 }}
          styles={{ popup: { root: { minWidth: 170 } } }}
          options={REGIONS.map(r => ({
            value: r.code,
            label: (
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 15 }}>{r.flag}</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>{r.label}</span>
              </span>
            ),
          }))}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <LockOutlined style={{ color: '#9CA3AF', fontSize: 11 }} />
          <Text style={{ fontSize: 12, color: '#9CA3AF' }}>SSL Secured</Text>
        </div>
      </div>
    </div>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

const STATS = [
  { value: '50,000+', label: 'Policies Issued' },
  { value: '99%',     label: 'Digital Activation' },
  { value: '3',       label: 'Markets Covered' },
  { value: '4',       label: 'Payment Providers' },
];

function Hero() {
  return (
    <div style={{ background: 'white', borderBottom: '1px solid #F3F4F6', padding: '64px 48px 52px', textAlign: 'center' }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        background: '#FFFBEB', border: '1px solid #FDE68A',
        borderRadius: 999, padding: '4px 14px', marginBottom: 20,
      }}>
        <CheckCircleOutlined style={{ color: '#D97706', fontSize: 12 }} />
        <span style={{ fontSize: 12, fontWeight: 600, color: '#92400E' }}>
          Regulated across Southeast Asia
        </span>
      </div>

      <h1 style={{ fontSize: 44, fontWeight: 900, color: '#111827', margin: '0 0 14px', letterSpacing: '-0.03em', lineHeight: 1.15 }}>
        Protect What Matters Most
      </h1>
      <p style={{ fontSize: 17, color: '#6B7280', margin: '0 auto 48px', maxWidth: 520, lineHeight: 1.7 }}>
        Compare and purchase insurance plans across Malaysia, Indonesia, and the Philippines — with intelligent payment routing built in.
      </p>

      {/* Stats */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: 0, maxWidth: 640, margin: '0 auto' }}>
        {STATS.map((s, i) => (
          <div key={s.label} style={{ flex: 1, padding: '0 24px', borderRight: i < STATS.length - 1 ? '1px solid #E5E7EB' : 'none' }}>
            <div style={{ fontSize: 26, fontWeight: 900, color: '#FCB900', lineHeight: 1 }}>{s.value}</div>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4, fontWeight: 500 }}>{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Product card ──────────────────────────────────────────────────────────────

function ProductCard({ product, onSelect }: { product: StoreProduct; onSelect: () => void }) {
  const meta = TYPE_META[product.insuranceType] ?? { icon: <SafetyOutlined />, color: '#374151', iconBg: '#F3F4F6' };
  const [coverageFeature, ...otherFeatures] = product.features;

  return (
    <div
      style={{
        background: 'white', borderRadius: 14, border: '1px solid #E5E7EB',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        transition: 'box-shadow 0.18s, border-color 0.18s, transform 0.18s',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.boxShadow = '0 8px 32px rgba(0,0,0,0.10)';
        el.style.borderColor = '#FCB900';
        el.style.transform = 'translateY(-2px)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement;
        el.style.boxShadow = 'none';
        el.style.borderColor = '#E5E7EB';
        el.style.transform = 'translateY(0)';
      }}
    >
      {/* Card body */}
      <div style={{ padding: '24px 24px 0', flex: 1, display: 'flex', flexDirection: 'column' }}>

        {/* Category row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: meta.iconBg, color: meta.color,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 14,
            }}>
              {meta.icon}
            </div>
            <span style={{ fontSize: 11, fontWeight: 700, color: meta.color, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              {product.insuranceType}
            </span>
          </div>
          {product.badge && (
            <Tag style={{ background: '#FFFBEB', color: '#92400E', border: '1px solid #FDE68A', borderRadius: 999, fontWeight: 700, fontSize: 11, margin: 0, padding: '2px 10px' }}>
              {product.badge}
            </Tag>
          )}
        </div>

        {/* Product name */}
        <div style={{ fontSize: 20, fontWeight: 800, color: '#111827', marginBottom: 6, lineHeight: 1.25 }}>
          {product.name}
        </div>

        {/* Tagline */}
        <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 18px', lineHeight: 1.65, minHeight: 42 }}>
          {product.tagline}
        </p>

        {/* Coverage highlight */}
        <div style={{
          background: '#FFFBEB', border: '1px solid #FDE68A',
          borderRadius: 10, padding: '12px 14px', marginBottom: 16,
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <CheckCircleOutlined style={{ color: '#D97706', fontSize: 16, flexShrink: 0 }} />
          <span style={{ fontSize: 13, fontWeight: 700, color: '#92400E', lineHeight: 1.4 }}>
            {coverageFeature}
          </span>
        </div>

        {/* Remaining features */}
        <ul style={{ listStyle: 'none', margin: '0 0 22px', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {otherFeatures.map(f => (
            <li key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: 9, fontSize: 13, color: '#374151' }}>
              <CheckOutlined style={{ color: '#9CA3AF', fontSize: 11, marginTop: 3, flexShrink: 0 }} />
              {f}
            </li>
          ))}
        </ul>
      </div>

      {/* Card footer */}
      <div style={{ padding: '16px 24px 20px', borderTop: '1px solid #F3F4F6' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, color: '#9CA3AF', fontWeight: 500, marginBottom: 2 }}>Starting from</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#111827', lineHeight: 1 }}>
              {formatAmount(product.amount, product.currency)}
            </div>
            <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 2 }}>per {product.billingPeriod}</div>
          </div>
          <Button
            onClick={onSelect}
            icon={<RightOutlined />}
            iconPosition="end"
            style={{
              height: 40, background: '#FCB900', borderColor: '#FCB900',
              color: '#111827', fontWeight: 700, fontSize: 13,
              borderRadius: 10, padding: '0 18px',
            }}
          >
            Get Started
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Trust band ────────────────────────────────────────────────────────────────

const TRUST_ITEMS = [
  {
    icon: <ThunderboltOutlined />,
    title: 'Intelligent Payment Routing',
    desc: 'Transactions are routed in real-time to the best-performing payment provider based on success rate, fee, and latency.',
  },
  {
    icon: <CheckCircleOutlined />,
    title: 'Instant Policy Issuance',
    desc: 'Receive your policy document digitally within minutes of payment confirmation — no paperwork, no waiting.',
  },
  {
    icon: <AuditOutlined />,
    title: 'Regulated & Compliant',
    desc: 'All products are underwritten by licensed insurers and supervised by respective financial authorities in each market.',
  },
];

function TrustBand({ region }: { region: RegionCode }) {
  const reg = REGIONS.find(r => r.code === region)!;
  return (
    <div style={{ background: 'white', borderTop: '1px solid #E5E7EB', padding: '56px 48px' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: '#111827', marginBottom: 8 }}>Why InsureRoute?</div>
          <div style={{ fontSize: 14, color: '#6B7280', maxWidth: 480, margin: '0 auto', lineHeight: 1.65 }}>
            We combine insurance coverage with intelligent payment infrastructure so your premium reaches the right provider, every time.
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 24, marginBottom: 40 }}>
          {TRUST_ITEMS.map(item => (
            <div key={item.title} style={{ padding: '24px', background: '#FAFAFA', borderRadius: 12, border: '1px solid #F0F0F0' }}>
              <div style={{
                width: 40, height: 40, borderRadius: 10, background: '#FFFBEB',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#D97706', fontSize: 18, marginBottom: 14,
              }}>
                {item.icon}
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 8 }}>{item.title}</div>
              <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.65 }}>{item.desc}</div>
            </div>
          ))}
        </div>

        <Divider style={{ borderColor: '#F0F0F0', margin: '0 0 24px' }} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32 }}>
          <Text style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 500 }}>Regulated by</Text>
          {[reg.regulator, 'InsureRoute Payment Network'].map(name => (
            <div key={name} style={{
              padding: '6px 16px', background: '#F9FAFB', border: '1px solid #E5E7EB',
              borderRadius: 999, fontSize: 12, color: '#374151', fontWeight: 600,
            }}>
              {name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer({ region }: { region: RegionCode }) {
  const reg = REGIONS.find(r => r.code === region)!;
  return (
    <div style={{ background: '#111827', padding: '32px 48px', color: '#9CA3AF' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{ width: 28, height: 28, borderRadius: 6, background: '#FCB900', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 11, color: '#111827' }}>IR</div>
              <span style={{ fontSize: 15, fontWeight: 700, color: 'white' }}>InsureRoute</span>
            </div>
            <div style={{ fontSize: 12, color: '#6B7280', maxWidth: 280, lineHeight: 1.65 }}>
              Southeast Asia's intelligent insurance payment orchestration platform. Payments powered by real-time routing.
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 32px' }}>
            {['Products', 'Claims', 'About', 'Privacy Policy', 'Terms of Use', 'Contact Us'].map(link => (
              <span key={link} style={{ fontSize: 13, color: '#6B7280', cursor: 'default', lineHeight: 2 }}>{link}</span>
            ))}
          </div>
        </div>
        <div style={{ borderTop: '1px solid #1F2937', paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Text style={{ fontSize: 12, color: '#4B5563' }}>
            © 2025 InsureRoute Sdn Bhd · Lic. No. IRS-2025-001 · Regulated by {reg.regulator}
          </Text>
          <Text style={{ fontSize: 12, color: '#4B5563' }}>
            <LockOutlined style={{ marginRight: 5 }} />Payments secured by 256-bit SSL
          </Text>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function InsureStorePage() {
  const navigate = useNavigate();
  const [region, setRegion]     = useState<RegionCode>('MY');
  const [category, setCategory] = useState('all');

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['store-products', region],
    queryFn: () => storeService.getProducts(region),
  });

  const regionInfo = REGIONS.find(r => r.code === region)!;

  const filtered = category === 'all'
    ? products
    : products.filter(p => CATEGORY_KEYS[p.insuranceType] === category);

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', display: 'flex', flexDirection: 'column' }}>

      <Navbar
        region={region}       onRegionChange={r => { setRegion(r); setCategory('all'); }}
        category={category}   onCategoryChange={setCategory}
      />
      <Hero />

      {/* Product grid */}
      <div style={{ flex: 1, maxWidth: 1080, margin: '0 auto', padding: '36px 48px 60px', width: '100%', boxSizing: 'border-box' }}>
        {isLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 0', gap: 16 }}>
            <Spin size="large" />
            <Text style={{ color: '#9CA3AF', fontSize: 13 }}>Loading plans…</Text>
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>🔍</div>
            <div style={{ fontSize: 16, fontWeight: 600, color: '#374151', marginBottom: 6 }}>No plans in this category</div>
            <Text style={{ color: '#9CA3AF', fontSize: 13 }}>Try selecting a different category or market.</Text>
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 20, display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>
                {filtered.length} plan{filtered.length !== 1 ? 's' : ''} available
              </span>
              <span style={{ fontSize: 13, color: '#9CA3AF' }}>
                in {regionInfo.label}
                {category !== 'all' ? ` · ${category === 'Accident' ? 'Personal Accident' : category}` : ''}
              </span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 20 }}>
              {filtered.map(p => (
                <ProductCard
                  key={p.id}
                  product={p}
                  onSelect={() => navigate('/buy/checkout', { state: { product: p } })}
                />
              ))}
            </div>
          </>
        )}
      </div>

      <TrustBand region={region} />
      <Footer region={region} />
    </div>
  );
}
