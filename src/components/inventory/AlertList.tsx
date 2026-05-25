import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { inventoryApi, type Alert, type AlertType } from '../../api/inventory';
import { useAlertStore } from '../../stores/alertStore';
import { SeverityBadge } from './SeverityBadge';
import { SEVERITY_STYLE_MAP } from '../../constants/alertSeverityStyles';

// Guidance text and target route per alert type (B17 fix)
const ALERT_GUIDANCE: Record<AlertType, { message: string; action: string; route: string }> = {
  LOW_STOCK: {
    message: 'Este producto tiene stock bajo. Crea una orden de compra para reabastecer antes de resolver la alerta.',
    action: 'Ir a Compras',
    route: '/app/purchasing',
  },
  OUT_OF_STOCK: {
    message: 'Este producto está sin stock. Registra una entrada de inventario o una orden de compra urgente.',
    action: 'Ir a Inventario',
    route: '/app/inventory',
  },
  OVERSTOCK: {
    message: 'Este producto tiene exceso de stock. Considera ajustar los umbrales o planificar una promoción.',
    action: 'Ir a Inventario',
    route: '/app/inventory',
  },
  STOCK_MOVEMENT: {
    message: 'Movimiento de stock registrado. Puedes revisar el historial en inventario.',
    action: 'Ver Inventario',
    route: '/app/inventory',
  },
};

// Alert type → target route, with defensive fallback
const ALERT_RESOLVE_ROUTE: Record<string, string> = {
  LOW_STOCK: '/app/purchasing',
  OUT_OF_STOCK: '/app/inventory',
  OVERSTOCK: '/app/inventory',
};

interface AlertListProps {
  alerts: Alert[];
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onRefresh?: () => Promise<void>;
}

/**
 * AlertList - Display paginated list of alerts with dismiss functionality
 */
export const AlertList: React.FC<AlertListProps> = ({
  alerts,
  isLoading,
  currentPage,
  totalPages,
  onPageChange,
  onRefresh,
}) => {
  const [updatingRead, setUpdatingRead] = useState<number | null>(null);
  const [resolving, setResolving] = useState<number | null>(null);
  const [guidanceAlert, setGuidanceAlert] = useState<Alert | null>(null);
  const markAsReadLocal = useAlertStore((state) => state.markAsReadLocal);
  const resolveAlertLocal = useAlertStore((state) => state.resolveAlertLocal);
  const navigate = useNavigate();

  // Step 1: Show contextual guidance, don't resolve yet (B17)
  const handleResolveClick = (alert: Alert) => {
    setGuidanceAlert(alert);
  };

  // Step 2: User confirmed — now actually resolve and navigate
  const handleConfirmResolve = async () => {
    if (!guidanceAlert) return;
    const alert = guidanceAlert;
    setGuidanceAlert(null);
    setResolving(alert.id);
    try {
      await inventoryApi.resolveAlert(alert.id);
      resolveAlertLocal(alert.id);
      if (onRefresh) {
        await onRefresh();
      }
      const targetRoute = ALERT_RESOLVE_ROUTE[alert.type] ?? '/app/inventory';
      navigate(targetRoute);
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    } finally {
      setResolving(null);
    }
  };

  const handleMarkAsRead = async (alertId: number) => {
    setUpdatingRead(alertId);
    try {
      await inventoryApi.markAlertAsRead(alertId);
      markAsReadLocal(alertId);
      if (onRefresh) {
        await onRefresh();
      }
    } catch (error) {
      console.error('Failed to mark alert as read:', error);
    } finally {
      setUpdatingRead(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div
          className="animate-spin rounded-full h-8 w-8 border-2"
          style={{
            borderColor: 'rgba(3, 142, 87, 0.2)',
            borderTopColor: '#038E57',
          }}
        ></div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="text-center py-12">
        <svg
          className="mx-auto h-12 w-12"
          style={{ color: '#9CA3AF' }}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <h3
          className="mt-2 text-lg font-medium"
          style={{ color: '#1F2937' }}
        >
          Sin alertas
        </h3>
        <p className="mt-1 text-sm" style={{ color: '#6B7280' }}>
          Tu inventario está en buen estado.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Alert items */}
      <div
        className="border-2 rounded-lg"
        style={{
          borderColor: '#E8E3DB',
        }}
      >
        {alerts.map((alert, idx) => (
          <div
            key={alert.id}
            className="p-4 transition-colors"
            style={{
              backgroundColor: SEVERITY_STYLE_MAP[alert.severity].rowBg,
              borderLeft: SEVERITY_STYLE_MAP[alert.severity].borderLeft,
              borderBottom: idx < alerts.length - 1 ? '1px solid #E8E3DB' : 'none',
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLDivElement).style.backgroundColor = SEVERITY_STYLE_MAP[alert.severity].hoverBg;
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLDivElement).style.backgroundColor = SEVERITY_STYLE_MAP[alert.severity].rowBg;
            }}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <SeverityBadge severity={alert.severity} />
                  <span className="text-xs" style={{ color: '#6B7280' }}>
                    {alert.type.replace(/_/g, ' ')}
                  </span>
                </div>
                <p
                  className="text-sm font-medium"
                  style={{ color: '#1F2937' }}
                >
                  {alert.productName}
                </p>
                <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
                  {alert.message}
                </p>
                <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>
                  {new Date(alert.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="ml-4 flex items-center gap-2">
                {!alert.read && (
                  <button
                    onClick={() => handleMarkAsRead(alert.id)}
                    disabled={updatingRead === alert.id || resolving === alert.id}
                    className="px-3 py-1 text-sm font-medium rounded transition"
                    style={{
                      color: '#1F2937',
                      backgroundColor: 'transparent',
                      opacity: updatingRead === alert.id ? 0.5 : 1,
                      cursor:
                        updatingRead === alert.id || resolving === alert.id
                          ? 'not-allowed'
                          : 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      if (updatingRead !== alert.id && resolving !== alert.id) {
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F3F4F6';
                      }
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                    }}
                  >
                    {updatingRead === alert.id ? 'Marcando...' : 'Marcar leída'}
                  </button>
                )}

                {alert.severity !== 'INFO' && (
                  <button
                    onClick={() => handleResolveClick(alert)}
                    disabled={resolving === alert.id || updatingRead === alert.id}
                    className="px-3 py-1 text-sm font-medium rounded transition"
                    style={{
                      color: '#038E57',
                      backgroundColor: 'transparent',
                      opacity: resolving === alert.id ? 0.5 : 1,
                      cursor:
                        resolving === alert.id || updatingRead === alert.id
                          ? 'not-allowed'
                          : 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      if (resolving !== alert.id && updatingRead !== alert.id) {
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#E8F4F0';
                      }
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                    }}
                  >
                    {resolving === alert.id ? 'Resolviendo...' : 'Resolver'}
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 0}
            className="px-3 py-2 text-sm font-medium rounded transition border-2"
            style={{
              color: '#1F2937',
              backgroundColor: '#FFFFFF',
              borderColor: '#E8E3DB',
              opacity: currentPage === 0 ? 0.5 : 1,
              cursor: currentPage === 0 ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (currentPage > 0) {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F9F7F2';
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#FFFFFF';
            }}
          >
            Anterior
          </button>
          <span className="text-sm" style={{ color: '#6B7280' }}>
            Página {currentPage + 1} de {totalPages}
          </span>
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages - 1}
            className="px-3 py-2 text-sm font-medium rounded transition border-2"
            style={{
              color: '#1F2937',
              backgroundColor: '#FFFFFF',
              borderColor: '#E8E3DB',
              opacity: currentPage >= totalPages - 1 ? 0.5 : 1,
              cursor: currentPage >= totalPages - 1 ? 'not-allowed' : 'pointer',
            }}
            onMouseEnter={(e) => {
              if (currentPage < totalPages - 1) {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#F9F7F2';
              }
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#FFFFFF';
            }}
          >
            Siguiente
          </button>
        </div>
      )}

      {/* Contextual guidance dialog before resolving (B17) */}
      {guidanceAlert && (() => {
        const guidance = ALERT_GUIDANCE[guidanceAlert.type] ?? {
          message: 'Verifica la situación antes de resolver esta alerta.',
          action: 'Ver Inventario',
          route: '/app/inventory',
        };
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-base font-semibold" style={{ color: '#1F2937' }}>Antes de resolver</h3>
                  <p className="text-xs" style={{ color: '#6B7280' }}>{guidanceAlert.productName}</p>
                </div>
              </div>
              <p className="text-sm mb-5" style={{ color: '#374151' }}>{guidance.message}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setGuidanceAlert(null)}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium border"
                  style={{ borderColor: '#E5E7EB', color: '#374151' }}
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    setGuidanceAlert(null);
                    navigate(guidance.route);
                  }}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-medium"
                  style={{ backgroundColor: '#F59E0B', color: '#fff' }}
                >
                  {guidance.action}
                </button>
                <button
                  onClick={() => void handleConfirmResolve()}
                  className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold"
                  style={{ backgroundColor: '#038E57', color: '#fff' }}
                >
                  Resolver
                </button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};
