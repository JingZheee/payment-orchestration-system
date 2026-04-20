import type { ThemeConfig } from 'antd';

export const theme: ThemeConfig = {
  token: {
    colorPrimary: '#7B5800',
    colorBgBase: '#FCF8FB',
    colorBgLayout: '#FCF8FB',
    fontFamily: "'Inter', sans-serif",
    borderRadius: 10,
    colorBorder: '#D4C4AB',
    colorBorderSecondary: '#F6F3F5',
    colorText: '#1C1C1E',
    colorTextSecondary: '#504532',
    colorTextTertiary: '#6B7280',
    colorSuccess: '#166534',
    colorError: '#991B1B',
    colorWarning: '#92400E',
    colorInfo: '#075985',
    boxShadow: '0 2px 40px rgba(80,69,50,0.04)',
    boxShadowSecondary: '0 1px 12px rgba(80,69,50,0.06)',
  },
  components: {
    Layout: {
      siderBg: '#FFFBEA',
      headerBg: '#FCF8FB',
      bodyBg: '#FCF8FB',
    },
    Table: {
      headerBg: '#F6F3F5',
      headerColor: '#504532',
      rowHoverBg: 'rgba(252,185,0,0.04)',
      borderColor: 'rgba(212,196,171,0.15)',
    },
    Card: {
      colorBgContainer: '#FFFFFF',
      boxShadow: '0 1px 12px rgba(80,69,50,0.06)',
      paddingLG: 24,
    },
    Button: {
      colorPrimary: '#FCB900',
      colorPrimaryHover: '#FFD154',
      colorPrimaryActive: '#e0a400',
      primaryColor: '#261900',
      borderRadius: 12,
      defaultBorderColor: '#D4C4AB',
    },
    Input: {
      colorBgContainer: '#F6F3F5',
      colorBorder: 'transparent',
      borderRadius: 10,
      activeBorderColor: '#7B5800',
      hoverBorderColor: '#D4C4AB',
    },
    Select: {
      colorBgContainer: '#F6F3F5',
      colorBorder: 'transparent',
      borderRadius: 10,
    },
    Tag: {
      borderRadius: 999,
    },
    Statistic: {
      titleFontSize: 12,
      contentFontSize: 28,
    },
  },
};
