import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPortal } from 'react-dom';

const FixedBackButton = () => {
  const navigate = useNavigate();

  return createPortal(
    <button
      onClick={() => navigate(-1)}
      style={{
        position: 'fixed',
        top: '16px',
        left: '16px',
        zIndex: 99999,
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        backgroundColor: 'rgba(255, 255, 255, 0.3)',
        border: '1px solid rgba(255, 255, 255, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        backdropFilter: 'blur(4px)',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        transition: 'all 0.2s ease',
        padding: '0',
        margin: '0',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.4)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
      }}
    >
      <ArrowLeft size={20} color="white" strokeWidth={3} />
    </button>,
    document.body
  );
};

export default FixedBackButton;
