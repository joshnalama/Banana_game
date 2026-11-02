import { useEffect, useRef, useState } from 'react';
import { api } from '../services/api.js';

export default function GoogleSignInButton({ onCredentialSuccess, onError }) {
  const btnRef = useRef(null);
  const [isConfigured, setIsConfigured] = useState(false);

  useEffect(() => {
    let active = true;

    api('/api/config')
      .then(({ googleClientId }) => {
        if (!active || !googleClientId) return;
        setIsConfigured(true);

        const initializeGSI = () => {
          if (!active || !btnRef.current || !window.google?.accounts?.id) return;
          try {
            window.google.accounts.id.initialize({
              client_id: googleClientId,
              callback: async ({ credential }) => {
                try {
                  const res = await api('/api/auth/google', {
                    method: 'POST',
                    body: { credential },
                  });
                  onCredentialSuccess(res.user);
                } catch (err) {
                  onError?.(err.message);
                }
              },
            });

            window.google.accounts.id.renderButton(btnRef.current, {
              theme: 'outline',
              size: 'large',
              shape: 'pill',
              text: 'continue_with',
              width: 280,
            });
          } catch (e) {
            console.warn('Failed to render GSI button:', e);
          }
        };

        if (window.google?.accounts?.id) {
          initializeGSI();
        } else {
          const script = document.createElement('script');
          script.src = 'https://accounts.google.com/gsi/client';
          script.async = true;
          script.onload = initializeGSI;
          document.head.appendChild(script);
        }
      })
      .catch(() => {});

    return () => {
      active = false;
    };
  }, [onCredentialSuccess, onError]);

  if (!isConfigured) return null;

  return (
    <div className="google-signin-wrapper">
      <div ref={btnRef} className="gsi-button-mount" />
    </div>
  );
}

