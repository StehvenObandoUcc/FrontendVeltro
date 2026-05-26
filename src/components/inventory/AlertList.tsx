import React, { useState } from 'react';
import { createPortal } from 'react-dom';
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
  const [guidanceAlert, setGuidanceAlert] = useState<Alert | null>(null);
  const [showActionChoices, setShowActionChoices] = useState(false);
  const markAsReadLocal = useAlertStore((state) => state.markAsReadLocal);
  const navigate = useNavigate();

  // Step 1: Show contextual guidance, don't resolve yet (B17)
  const handleResolveClick = (alert: Alert) => {
    setGuidanceAlert(alert);
    setShowActionChoices(false);
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
                    disabled={updatingRead === alert.id}
                    className="px-3 py-1 text-sm font-medium rounded transition"
                    style={{
                      color: '#1F2937',
                      backgroundColor: 'transparent',
                      opacity: updatingRead === alert.id ? 0.5 : 1,
                      cursor:
                        updatingRead === alert.id
                          ? 'not-allowed'
                          : 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      if (updatingRead !== alert.id) {
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
                    disabled={updatingRead === alert.id}
                    className="px-3 py-1 text-sm font-medium rounded transition"
                    style={{
                      color: '#038E57',
                      backgroundColor: 'transparent',
                      opacity: updatingRead === alert.id ? 0.5 : 1,
                      cursor:
                        updatingRead === alert.id
                          ? 'not-allowed'
                          : 'pointer',
                    }}
                    onMouseEnter={(e) => {
                      if (updatingRead !== alert.id) {
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#E8F4F0';
                      }
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent';
                    }}
                  >
                    Resolver
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

      {/* Contextual guidance dialog before resolving */}
      {guidanceAlert && createPortal(
        (() => {
          const guidance = ALERT_GUIDANCE[guidanceAlert.type] ?? {
            message: 'Verifica la situación antes de resolver esta alerta.',
            action: 'Ver Inventario',
            route: '/app/inventory',
          };
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 text-left">
              <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 transition-all duration-300">
                
                {!showActionChoices ? (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900">Antes de resolver</h3>
                        <p className="text-xs font-semibold text-gray-500">{guidanceAlert.productName}</p>
                      </div>
                    </div>
                    
                    <p className="text-sm mb-6 text-gray-600 leading-relaxed">{guidance.message}</p>
                    
                    <div className="flex gap-3">
                      <button
                        onClick={() => setGuidanceAlert(null)}
                        className="flex-1 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-center"
                      >
                        Cancelar
                      </button>
                      <button
                        onClick={() => setShowActionChoices(true)}
                        className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#038E57] hover:bg-[#027A4B] shadow-md transition-colors text-center"
                      >
                        Resolver
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-full bg-[#E8F4F0] flex items-center justify-center flex-shrink-0">
                        <svg className="w-5 h-5 text-[#038E57]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900">¿Cómo deseas resolverla?</h3>
                        <p className="text-xs font-semibold text-gray-500">{guidanceAlert.productName}</p>
                      </div>
                    </div>
                    
                    <p className="text-sm mb-6 text-gray-600 leading-relaxed">
                      Las alertas de stock se solucionan automáticamente cuando se resuelve el problema de raíz. Elige una de las siguientes opciones para corregir el stock:
                    </p>
                    
                    <div className="space-y-3 mb-6">
                      <button
                        onClick={() => {
                          setGuidanceAlert(null);
                          navigate('/app/purchasing');
                        }}
                        className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-[#038E57] hover:bg-[#038E57]/5 group transition-all text-left"
                      >
                        <div>
                          <span className="block text-sm font-bold text-gray-800 group-hover:text-[#038E57]">Realizar Orden de Compra</span>
                          <span className="block text-xs text-gray-500 mt-0.5">Crea un pedido con un proveedor para abastecer el stock</span>
                        </div>
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-[#038E57] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
  
                      <button
                        onClick={() => {
                          setGuidanceAlert(null);
                          navigate('/app/inventory');
                        }}
                        className="w-full flex items-center justify-between p-3.5 rounded-xl border border-slate-200 hover:border-[#038E57] hover:bg-[#038E57]/5 group transition-all text-left"
                      >
                        <div>
                          <span className="block text-sm font-bold text-gray-800 group-hover:text-[#038E57]">Realizar Conteo / Ajuste</span>
                          <span className="block text-xs text-gray-500 mt-0.5">Registra una entrada manual o corrección física de inventario</span>
                        </div>
                        <svg className="w-5 h-5 text-gray-400 group-hover:text-[#038E57] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                    </div>
                    
                    <div className="flex gap-3">
                      <button
                        onClick={() => setShowActionChoices(false)}
                        className="flex-1 px-4 py-2 rounded-lg text-sm font-medium border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors text-center"
                      >
                        Atrás
                      </button>
                      <button
                        onClick={() => setGuidanceAlert(null)}
                        className="flex-1 px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-800 transition-colors text-center"
                      >
                        Cancelar
                      </button>
                    </div>
                  </>
                )}
  
              </div>
            </div>
          );
        })(),
        document.body
      )}
    </div>
  );
};
