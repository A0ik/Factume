import { ImageResponse } from '@vercel/og';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const title = searchParams.get('title') || 'Factu.me - Logiciel de facturation gratuit';
  const description = searchParams.get('description') || 'Créez des factures professionnelles en 30 secondes. Gratuit jusqu\'à 3 factures.';
  const theme = searchParams.get('theme') || 'blue';

  const colors = {
    blue: { bg: '#eff6ff', primary: '#2563eb', accent: '#1e40af' },
    green: { bg: '#f0fdf4', primary: '#16a34a', accent: '#166534' },
    purple: { bg: '#faf5ff', primary: '#9333ea', accent: '#7e22ce' },
  };

  const colorScheme = colors[theme as keyof typeof colors] || colors.blue;

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: colorScheme.bg,
          backgroundImage: `linear-gradient(135deg, ${colorScheme.bg} 0%, ${colorScheme.primary}10 100%)`,
          fontSize: 60,
          fontWeight: 700,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            textAlign: 'center',
            padding: '40px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              marginBottom: '30px',
            }}
          >
            <div
              style={{
                width: '80px',
                height: '80px',
                backgroundColor: colorScheme.primary,
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '40px',
                fontWeight: 'bold',
              }}
            >
              F
            </div>
            <span
              style={{
                fontSize: '48px',
                color: colorScheme.accent,
                fontWeight: 800,
              }}
            >
              Factu.me
            </span>
          </div>

          <div
            style={{
              fontSize: '52px',
              color: '#1f2937',
              fontWeight: 700,
              lineHeight: 1.2,
              maxWidth: '1000px',
              marginBottom: '20px',
            }}
          >
            {title}
          </div>

          <div
            style={{
              fontSize: '32px',
              color: '#6b7280',
              fontWeight: 400,
              maxWidth: '900px',
            }}
          >
            {description}
          </div>

          <div
            style={{
              display: 'flex',
              gap: '15px',
              marginTop: '40px',
              fontSize: '24px',
            }}
          >
            <div
              style={{
                backgroundColor: colorScheme.primary,
                color: 'white',
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: 600,
              }}
            >
              Gratuit
            </div>
            <div
              style={{
                backgroundColor: 'white',
                color: colorScheme.primary,
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: 600,
                border: `2px solid ${colorScheme.primary}`,
              }}
            >
              30 secondes
            </div>
            <div
              style={{
                backgroundColor: 'white',
                color: colorScheme.primary,
                padding: '12px 24px',
                borderRadius: '8px',
                fontWeight: 600,
                border: `2px solid ${colorScheme.primary}`,
              }}
            >
              Sans engagement
            </div>
          </div>
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
