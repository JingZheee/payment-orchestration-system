export default function DeadLetterQueue() {
  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1C1C1E', marginBottom: 4 }}>Stalled Transactions</h1>
      <p style={{ color: '#6B7280', fontSize: 14 }}>Review and resolve payments that have exhausted all automated retry logic.</p>
    </div>
  );
}
