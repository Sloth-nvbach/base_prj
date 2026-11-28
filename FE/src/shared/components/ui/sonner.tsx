import { Toaster as SonnerToaster } from 'sonner';

// Colours come from the theme tokens, so toasts follow light/dark without a re-render.
function Toaster() {
  return (
    <SonnerToaster
      position="bottom-left"
      toastOptions={{
        style: {
          background: 'var(--popover)',
          color: 'var(--popover-foreground)',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          fontFamily: 'var(--font-sans)',
        },
      }}
    />
  );
}

export { Toaster };
