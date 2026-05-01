import React from 'react';
import { Bell } from 'lucide-react';
import { useAlertStore } from '../../stores/alertStore';
import { useNavigate } from 'react-router-dom';

/**
 * AlertBadge - Display unread alerts count in header
 * Uses centralized unreadCount state from alert store
 */
export const AlertBadge: React.FC = () => {
  const unreadCount = useAlertStore((state) => state.unreadCount);
  const navigate = useNavigate();

  const handleClick = () => {
    navigate('/app/alerts');
  };

  return (
    <button
      onClick={handleClick}
      className="relative inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-700 shadow-sm ring-1 ring-black/5 transition-colors hover:bg-gray-50 hover:text-gray-900"
      style={{
        color: '#374151',
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(0.98)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.filter = 'brightness(1)';
      }}
      aria-label={
        unreadCount > 0 ? `${unreadCount} alertas sin leer` : 'Ver alertas'
      }
      title={unreadCount > 0 ? 'Clic para ver alertas' : 'Ver alertas'}
    >
      <Bell className="h-5 w-5" strokeWidth={2.25} />
      {unreadCount > 0 && (
        <span
          className="absolute -right-1.5 -top-1.5 inline-flex min-w-[1.25rem] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-bold leading-none"
          style={{
            backgroundColor: '#FF2E21',
            color: '#FFFFFF',
            boxShadow: '0 0 0 2px #FFFFFF',
          }}
        >
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </button>
  );
};
