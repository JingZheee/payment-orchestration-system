interface KpiCardProps {
  label: string;
  value: string | number;
  icon: string;
  iconBg?: string;
  iconColor?: string;
}

export default function KpiCard({ label, value, icon, iconBg = 'rgba(252,185,0,0.1)', iconColor = '#7B5800' }: KpiCardProps) {
  return (
    <div style={{
      background: '#FFFFFF',
      borderRadius: 16,
      padding: 24,
      boxShadow: '0 4px 40px -12px rgba(80,69,50,0.08)',
      display: 'flex',
      flexDirection: 'column',
      gap: 16,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span style={{
          fontSize: 11, fontWeight: 600, color: '#504532',
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          {label}
        </span>
        <div style={{
          padding: 8, borderRadius: 8,
          background: iconBg, color: iconColor,
          display: 'flex', alignItems: 'center',
        }}>
          <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{icon}</span>
        </div>
      </div>
      <div style={{ fontSize: 32, fontWeight: 800, color: '#1C1C1E', lineHeight: 1 }}>
        {value}
      </div>
    </div>
  );
}
