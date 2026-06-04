// AI Solutions Branding Wrapper - Use as page layout
import React from 'react';

const brandingStyles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #f3f4f6 0%, #ffffff 100%)',
    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
    margin: 0,
    padding: 0,
  },
  header: {
    background: 'linear-gradient(90deg, #1f2937 0%, #111827 100%)',
    color: '#fff',
    padding: '24px 20px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
    borderBottom: '3px solid #dc2626',
  },
  headerContent: {
    maxWidth: 1200,
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  logo: {
    fontSize: 24,
    fontWeight: 700,
    letterSpacing: -1,
    color: '#fff',
  },
  logoAccent: {
    color: '#dc2626',
  },
  tagline: {
    fontSize: 13,
    color: '#9ca3af',
    marginTop: 4,
  },
  main: {
    maxWidth: 760,
    margin: '40px auto',
    padding: '0 20px',
  },
  card: {
    background: '#fff',
    borderRadius: 12,
    boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
    padding: 32,
    marginBottom: 24,
  },
  footer: {
    background: '#f9fafb',
    borderTop: '1px solid #e5e7eb',
    padding: '32px 20px',
    textAlign: 'center' as const,
    color: '#6b7280',
    fontSize: 13,
    marginTop: 60,
  },
  footerLink: {
    color: '#dc2626',
    textDecoration: 'none',
    fontWeight: 500,
  },
};

interface BrandedLayoutProps {
  children: React.ReactNode;
}

export function BrandedLayout({ children }: BrandedLayoutProps) {
  return (
    <div style={brandingStyles.container}>
      {/* Header */}
      <header style={brandingStyles.header}>
        <div style={brandingStyles.headerContent}>
          <div>
            <div style={brandingStyles.logo}>
              AI <span style={brandingStyles.logoAccent}>Solutions</span>
            </div>
            <div style={brandingStyles.tagline}>Voice Recording & Transcription</div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main style={brandingStyles.main}>
        <div style={brandingStyles.card}>
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer style={brandingStyles.footer}>
        <p style={{ margin: '0 0 12px 0' }}>© 2026 AI Solutions. All rights reserved.</p>
        <p style={{ margin: 0 }}>
          Questions? Contact us at{' '}
          <a
            href="mailto:alerts@aisolutionsnet.net"
            style={brandingStyles.footerLink}
          >
            alerts@aisolutionsnet.net
          </a>
        </p>
      </footer>
    </div>
  );
}

export default BrandedLayout;
