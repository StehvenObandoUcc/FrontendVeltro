import React, { useState, useEffect } from 'react';
import { inventoryApi, type Alert } from '../../api/inventory';
import { AlertList } from '../../components/inventory';
import { useAlertStore } from '../../stores/alertStore';
import { useAuthStore } from '../../stores/authStore';

export const AlertListPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isBulkActionLoading, setIsBulkActionLoading] = useState(false);
  const [bulkActionError, setBulkActionError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedSeverity, setSelectedSeverity] = useState<string | undefined>(undefined);
  const activeAlerts = useAlertStore((state) => state.activeAlerts);
  const unreadCount = useAlertStore((state) => state.unreadCount);
  const setActiveAlerts = useAlertStore((state) => state.setActiveAlerts);
  const setUnreadCount = useAlertStore((state) => state.setUnreadCount);
  const userRole = useAuthStore((state) => state.user?.role);

  const canMarkAllAsRead = userRole === 'ADMIN' || userRole === 'WAREHOUSE';
  const canResolveAll = userRole === 'ADMIN';

  const fetchAlerts = React.useCallback(async () => {
    setIsLoading(true);
    try {
      const [alertsResponse, unreadResponse] = await Promise.all([
        inventoryApi.getAlerts(currentPage, selectedSeverity),
        inventoryApi.getUnreadAlertCount(),
      ]);

      const alerts = alertsResponse.content.filter((alert: Alert) => !alert.resolved);
      setTotalPages(alertsResponse.totalPages);
      setActiveAlerts(alerts);
      setUnreadCount(unreadResponse.count);
    } catch (error) {
      console.error('Failed to fetch alerts:', error);
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, selectedSeverity, setActiveAlerts, setUnreadCount]);

  useEffect(() => {
    void fetchAlerts();
  }, [fetchAlerts]);

  const handleSeverityChange = (severity: string | undefined) => {
    setSelectedSeverity(severity);
    setCurrentPage(0);
  };

  const handleMarkAllAsRead = async () => {
    if (!canMarkAllAsRead || unreadCount === 0) return;
    setBulkActionError(null);
    setIsBulkActionLoading(true);
    try {
      await inventoryApi.markAllAlertsAsRead();
      await fetchAlerts();
    } catch {
      setBulkActionError('No se pudieron marcar todas las alertas como leidas.');
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  const handleResolveAll = async () => {
    if (!canResolveAll || activeAlerts.length === 0) return;

    const confirmed = window.confirm('Esta acción eliminará todas las notificaciones activas del negocio actual.');
    if (!confirmed) return;

    setBulkActionError(null);
    setIsBulkActionLoading(true);
    try {
      await inventoryApi.resolveAllAlerts();
      await fetchAlerts();
    } catch {
      setBulkActionError('No se pudieron resolver todas las alertas.');
    } finally {
      setIsBulkActionLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">Alertas de Inventario</h1>
        <p className="mt-1 text-[var(--text-secondary)] text-sm">Monitorea y gestiona las alertas de stock</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">No leidas: {unreadCount}</p>
        <p className="mt-1 text-xs text-[var(--text-muted)]">Las acciones globales aplican a todo el negocio, no solo a esta pagina.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {canMarkAllAsRead && (
            <button
              onClick={() => void handleMarkAllAsRead()}
              disabled={isBulkActionLoading || unreadCount === 0}
              className="btn-secondary"
            >
              {isBulkActionLoading ? 'Procesando...' : 'Marcar todas como leidas'}
            </button>
          )}
          {canResolveAll && (
            <button
              onClick={() => void handleResolveAll()}
              disabled={isBulkActionLoading || activeAlerts.length === 0}
              className="btn-primary"
            >
              {isBulkActionLoading ? 'Procesando...' : 'Eliminar Notificaciones'}
            </button>
          )}
        </div>
        {bulkActionError && <p className="mt-2 text-sm text-[var(--critical-red)]">{bulkActionError}</p>}
      </div>

      <div className="card p-6">
        <label className="block text-sm font-semibold text-[var(--text-primary)] mb-4">Filtrar por Severidad</label>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleSeverityChange(undefined)}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm ${
              selectedSeverity === undefined
                ? 'bg-slate-800 text-white shadow-md'
                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            Todas
          </button>
          <button
            onClick={() => handleSeverityChange('CRITICAL')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm flex items-center gap-2 ${
              selectedSeverity === 'CRITICAL'
                ? 'bg-red-600 text-white shadow-md'
                : 'bg-white border border-red-200 text-red-700 hover:bg-red-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-current"></span> Criticas
          </button>
          <button
            onClick={() => handleSeverityChange('WARNING')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm flex items-center gap-2 ${
              selectedSeverity === 'WARNING'
                ? 'bg-orange-500 text-white shadow-md'
                : 'bg-white border border-orange-200 text-orange-700 hover:bg-orange-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-current"></span> Advertencias
          </button>
          <button
            onClick={() => handleSeverityChange('INFO')}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all shadow-sm flex items-center gap-2 ${
              selectedSeverity === 'INFO'
                ? 'bg-blue-600 text-white shadow-md'
                : 'bg-white border border-blue-200 text-blue-700 hover:bg-blue-50'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-current"></span> Informacion
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <AlertList
          alerts={activeAlerts}
          isLoading={isLoading}
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          onRefresh={fetchAlerts}
        />
      </div>
    </div>
  );
};
