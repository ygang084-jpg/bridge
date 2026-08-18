tailwind.config = {
  theme: {
    extend: {
      colors: {
        primary: '#0F172A',
        'on-primary': '#FFFFFF',
        accent: '#0369A1',
        'on-accent': '#FFFFFF',
        bg: '#F8FAFC',
        surface: '#FFFFFF',
        'surface-muted': '#F1F5F9',
        fg: '#0F172A',
        'fg-muted': '#64748B',
        border: '#E2E8F0',
        safe: { bg: '#ECFDF3', fg: '#15803D' },
        caution: { bg: '#FFFBEB', fg: '#B45309' },
        danger: { bg: '#FEF2F2', fg: '#B91C1C' },
        unknown: { bg: '#F1F5F9', fg: '#64748B' },
        // 자동 요약 배지. AI 생성이 아니라 규칙 기반 문장 템플릿이므로 이름을 summary 로 둔다.
        summary: { bg: '#EFF6FF', fg: '#1D4ED8' },
      },
      fontFamily: {
        sans: ['Noto Sans KR', 'sans-serif'],
      },
      maxWidth: {
        app: '480px',
      },
    },
  },
};
