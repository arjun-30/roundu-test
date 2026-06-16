import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * NoProvidersFound – displayed when a search yields no results.
 *
 * Design goals:
 *  • Premium, glass‑morphism card with subtle gradient.
 *  • Responsive layout – centres vertically & horizontally.
 *  • Accessible – focusable button, ARIA label.
 */
const NoProvidersFound: React.FC = () => {
  const navigate = useNavigate();

  const handleBackHome = () => {
    navigate('/home'); // go to the home screen
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>No providers found</h1>
        <p style={styles.message}>
          We couldn’t locate any providers matching your criteria. Try adjusting
          your filters or search again later.
        </p>
        <button style={styles.button} onClick={handleBackHome} aria-label="Back to Home">
          Back to Home
        </button>
      </div>
    </div>
  );
};

// Inline‑style objects keep the component self‑contained and avoid pulling in a CSS
// pre‑processor. The colour palette follows the app’s dark‑mode aesthetic.
const styles: { [key: string]: React.CSSProperties } = {
  container: {
    minHeight: '80vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0d0d0d 0%, #1a1a1a 100%)',
    padding: '2rem',
  },
  card: {
    backdropFilter: 'blur(12px) saturate(180%)',
    background: 'rgba(255,255,255,0.07)',
    borderRadius: '1rem',
    padding: '2rem 3rem',
    maxWidth: '420px',
    textAlign: 'center',
    color: '#f0f0f0',
    boxShadow: '0 8px 32px 0 rgba(0,0,0,0.37)',
  },
  title: {
    fontSize: '2rem',
    marginBottom: '0.5rem',
    fontFamily: '\'Inter\', sans-serif',
    fontWeight: 600,
  },
  message: {
    fontSize: '1rem',
    marginBottom: '1.5rem',
    lineHeight: 1.4,
  },
  button: {
    cursor: 'pointer',
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    borderRadius: '0.5rem',
    border: 'none',
    background: 'linear-gradient(90deg, #ff7e5f, #feb47b)',
    color: '#fff',
    transition: 'transform 0.2s ease',
  },
};

export default NoProvidersFound;
