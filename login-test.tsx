import { useQuery } from "@tanstack/react-query";

export default function LoginTest() {
  const { data: diagnostic } = useQuery({
    queryKey: ["/api/diagnostic"],
  });

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'monospace' }}>
      <h1 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '20px' }}>
        🔧 Diagnóstico de Login
      </h1>
      
      <div style={{ marginBottom: '30px', padding: '15px', background: '#f0f0f0', borderRadius: '8px' }}>
        <h2 style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '10px' }}>
          📊 Informações da Requisição:
        </h2>
        <pre style={{ fontSize: '12px', overflow: 'auto' }}>
          {JSON.stringify(diagnostic, null, 2)}
        </pre>
      </div>

      <div style={{ marginBottom: '20px', padding: '15px', background: '#fff3cd', borderRadius: '8px' }}>
        <p><strong>⚠️ IMPORTANTE:</strong></p>
        <p>Antes de clicar em qualquer botão abaixo:</p>
        <p>1. Veja a URL EXATA mostrada acima em <strong>"computed.callbackURL"</strong></p>
        <p>2. Copie essa URL e me envie</p>
        <p>3. Depois pode tentar fazer login</p>
      </div>

      <div style={{ marginBottom: '10px' }}>
        <a 
          href="/api/login"
          style={{
            display: 'block',
            padding: '12px 24px',
            background: '#0066cc',
            color: 'white',
            textAlign: 'center',
            borderRadius: '6px',
            textDecoration: 'none',
            marginBottom: '10px'
          }}
        >
          🔑 Tentar Login
        </a>
      </div>

      <div style={{ marginTop: '20px' }}>
        <a href="/" style={{ color: '#0066cc' }}>← Voltar para Home</a>
      </div>
    </div>
  );
}
