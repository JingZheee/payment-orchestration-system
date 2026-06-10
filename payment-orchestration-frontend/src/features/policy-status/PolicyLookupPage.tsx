import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './PolicyLookupPage.module.css';
import { usePolicyLookup } from './hooks/usePolicyStatus';

export default function PolicyLookupPage() {
  const navigate = useNavigate();
  const [email, setEmail]               = useState('');
  const [policyNumber, setPolicyNumber] = useState('');
  const [error, setError]               = useState<string | null>(null);
  const lookup = usePolicyLookup();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pn = params.get('policyNumber');
    if (pn) setPolicyNumber(pn);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const { policyId } = await lookup.mutateAsync({ email, policyNumber });
      navigate(`/store/policy/${policyId}`);
    } catch {
      setError('No policy found with those details. Please check your email address and policy number.');
    }
  }

  const canSubmit = email.trim().length > 0 && policyNumber.trim().length > 0;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.logo}>IR</div>
        <div>
          <div className={styles.logoName}>InsureRoute</div>
          <div className={styles.logoSub}>Policy Status</div>
        </div>
      </header>

      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.icon}>🔍</div>
          <div className={styles.title}>Check Policy Status</div>
          <div className={styles.subtitle}>
            Enter your registered email and policy number to view your coverage status and payment history.
          </div>

          {error && <div className={styles.errorBanner}>{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className={styles.field}>
              <div className={styles.fieldLabel}>Email Address</div>
              <input
                className={styles.input}
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div className={styles.field}>
              <div className={styles.fieldLabel}>Policy Number</div>
              <input
                className={styles.input}
                type="text"
                placeholder="e.g. POL-MY-3456789"
                value={policyNumber}
                onChange={e => setPolicyNumber(e.target.value.toUpperCase())}
                autoComplete="off"
                required
              />
            </div>

            <button
              type="submit"
              className={styles.submitBtn}
              disabled={!canSubmit || lookup.isPending}
            >
              {lookup.isPending ? 'Searching…' : 'View Policy Status →'}
            </button>
          </form>
        </div>
      </main>

      <div className={styles.footer}>
        Powered by <strong style={{ color: '#6B7280' }}>InsureRoute</strong> · Payment Orchestration System
      </div>
    </div>
  );
}
