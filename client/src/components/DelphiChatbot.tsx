import { useEffect } from 'react';

export default function DelphiChatbot() {
  useEffect(() => {
    // Initialize Delphi configuration
    (window as any).delphi = {...((window as any).delphi ?? {})};
    (window as any).delphi.page = {
      config: "00175779-acb8-4580-a7ec-8469446841a4",
      overrides: {
        landingPage: "OVERVIEW",
      },
      container: {
        width: "100%",
        height: "800px",
      },
    };

    // Load Delphi script
    const script = document.createElement('script');
    script.id = 'delphi-page-bootstrap';
    script.src = 'https://embed.delphi.ai/loader.js';
    script.async = true;
    document.body.appendChild(script);

    return () => {
      // Cleanup: remove script on unmount
      const existingScript = document.getElementById('delphi-page-bootstrap');
      if (existingScript) {
        existingScript.remove();
      }
    };
  }, []);

  return (
    <div 
      id="delphi-page-container" 
      className="w-full h-[800px] rounded-lg border-2 border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40"
      data-testid="container-delphi-chatbot"
    />
  );
}
