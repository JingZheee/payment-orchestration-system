import { useState } from 'react';
import { Form, Input, Button, Alert } from 'antd';
import { useNavigate, useLocation } from 'react-router-dom';
import { authService } from './services/authService';
import type { LoginRequest } from '../../shared/types/auth';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? '/dashboard';
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onFinish(values: LoginRequest) {
    setLoading(true);
    setError(null);
    try {
      const { accessToken, refreshToken, role } = await authService.login(values);
      localStorage.setItem('pos_access_token', accessToken);
      localStorage.setItem('pos_refresh_token', refreshToken);
      localStorage.setItem('pos_role', role);
      navigate(from, { replace: true });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      setError(msg ?? 'Invalid email or password');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#FCF8FB',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        width: 420,
        background: '#FFFFFF',
        borderRadius: 20,
        padding: '48px 40px',
        boxShadow: '0 8px 60px -16px rgba(80,69,50,0.14)',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 40 }}>
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: '#FCB900',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'white', fontWeight: 800, fontSize: 17, flexShrink: 0,
          }}>
            IR
          </div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 900, color: '#1C1C1E', lineHeight: 1.2 }}>InsureRoute</div>
            <div style={{ fontSize: 11, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Payment Orchestration
            </div>
          </div>
        </div>

        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#1C1C1E', margin: '0 0 6px' }}>Sign in</h1>
        <p style={{ fontSize: 13, color: '#6B7280', margin: '0 0 28px' }}>
          Access the admin dashboard
        </p>

        {error && (
          <Alert
            type="error"
            message={error}
            showIcon
            style={{ marginBottom: 20, borderRadius: 10 }}
          />
        )}

        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item
            label={<span style={{ fontSize: 12, fontWeight: 600, color: '#504532', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Email</span>}
            name="email"
            rules={[
              { required: true, message: 'Email is required' },
              { type: 'email', message: 'Enter a valid email' },
            ]}
          >
            <Input
              size="large"
              placeholder="admin@example.com"
              style={{ borderRadius: 10, background: '#F6F3F5', border: 'none' }}
            />
          </Form.Item>

          <Form.Item
            label={<span style={{ fontSize: 12, fontWeight: 600, color: '#504532', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Password</span>}
            name="password"
            rules={[{ required: true, message: 'Password is required' }]}
            style={{ marginBottom: 28 }}
          >
            <Input.Password
              size="large"
              placeholder="••••••••"
              style={{ borderRadius: 10, background: '#F6F3F5', border: 'none' }}
            />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            size="large"
            block
            loading={loading}
            style={{
              background: 'linear-gradient(180deg, #FCB900 0%, #e0a400 100%)',
              border: 'none',
              color: '#261900',
              fontWeight: 700,
              borderRadius: 12,
              height: 48,
              fontSize: 15,
            }}
          >
            Sign in
          </Button>
        </Form>
      </div>
    </div>
  );
}
