/** @type {import('tailwindcss').Config} */
export default {
  theme: {
    extend: {
      colors: {
        primary: 'var(--color-primary)',
        'primary-mid': 'var(--color-primary-mid)',
        'primary-dark': 'var(--color-primary-dark)',
        'primary-light': 'var(--color-primary-light)',
        accent: 'var(--color-accent)',
        navy: 'var(--color-navy)',
        'navy-mid': 'var(--color-navy-mid)',
        'navy-gradient': 'var(--color-navy-gradient)',
        success: 'var(--color-success)',
        'success-bg': 'var(--color-success-bg)',
        error: 'var(--color-error)',
        'error-bg': 'var(--color-error-bg)',
        warning: 'var(--color-warning)',
        'warning-bg': 'var(--color-warning-bg)',
        surface: 'var(--color-surface)',
        'surface-muted': 'var(--color-surface-muted)',
      },
      spacing: {
        'sidebar': '280px',
        'panel-right': '380px',
        'header-brand': '84px',
        'input-h': '42px',
      },
      fontSize: {
        'brand-h1': ['13px', { fontWeight: '600', lineHeight: '1', letterSpacing: '-0.02em' }],
        'brand-tagline': ['10px', { fontWeight: '400', letterSpacing: '0.1em' }],
        'menu-item': ['14px', { lineHeight: '1.4' }],
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
      },
      boxShadow: {
        sm: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
      },
    },
  },
};
