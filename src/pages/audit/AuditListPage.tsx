import React, { useState, useEffect } from 'react';
import { ShieldCheck, Download, Info } from 'lucide-react';
import { auditApi } from '../../api/audit';
import type { AuditRecord, AuditFilters } from '../../api/audit';
import {
  AuditTable,
  AuditDetailModal,
  AuditFilters as AuditFiltersComponent,
} from '../../components/audit';

/**
 * AuditListPage - ADMIN-only page for viewing forensic audit trail
 * Displays all system changes with full diff tracking
 */
export const AuditListPage: React.FC = () => {
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<AuditRecord | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const [filters, setFilters] = useState<AuditFilters>({
    page: 0,
    pageSize: 20,
  });

  const [pagination, setPagination] = useState({
    totalPages: 0,
    currentPage: 0,
  });

  // Fetch audit records
  const fetchAuditRecords = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await auditApi.getAuditRecords(filters);
      setRecords(response.content);
      setPagination({
        totalPages: response.totalPages,
        currentPage: response.number,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Error al cargar registros de auditoría'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditRecords();
  }, [filters]);

  const handleFilterChange = (newFilters: AuditFilters) => {
    setFilters({
      ...filters,
      ...newFilters,
      page: newFilters.page !== undefined ? newFilters.page : 0,
    });
  };

  const handleResetFilters = () => {
    setFilters({
      page: 0,
      pageSize: 20,
    });
  };

  const handleExportCsv = () => {
    setIsExporting(true);
    setTimeout(() => {
      setError('La exportación CSV de auditoría aún no está disponible.');
      setIsExporting(false);
    }, 500);
  };

  const handleRecordClick = (record: AuditRecord) => {
    setSelectedRecord(record);
    setIsDetailOpen(true);
  };

  const handleDetailClose = () => {
    setIsDetailOpen(false);
    // Keep selectedRecord for smooth closing animation
    setTimeout(() => setSelectedRecord(null), 300);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header and Export */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight flex items-center gap-2">
            Registro de Auditoría <ShieldCheck size={22} className="text-[var(--primary-base)]" />
          </h1>
          <p className="mt-1 text-[var(--text-secondary)] text-sm">
            Registro forense completo de todos los cambios del sistema
          </p>
        </div>
        <button
          onClick={handleExportCsv}
          disabled={isExporting || records.length === 0}
          className="btn-secondary flex items-center gap-2"
        >
          <span><Download size={16} /></span>
          {isExporting ? 'Exportando...' : 'Exportar a CSV'}
        </button>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="p-4 rounded-xl mb-6 bg-red-50 border border-red-200 text-red-600 shadow-sm">
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="card p-6">
        <AuditFiltersComponent
          filters={filters}
          onFiltersChange={handleFilterChange}
          onReset={handleResetFilters}
        />
      </div>

      {/* Audit Table */}
      <div className="card overflow-x-auto">
        <AuditTable
          records={records}
          isLoading={isLoading}
          totalPages={pagination.totalPages}
          currentPage={pagination.currentPage}
          onPageChange={(page) => handleFilterChange({ page })}
          onRecordClick={handleRecordClick}
        />
      </div>

      {/* Detail Modal */}
      {selectedRecord && (
        <AuditDetailModal
          record={selectedRecord}
          isOpen={isDetailOpen}
          onClose={handleDetailClose}
        />
      )}

      {/* Info Footer */}
      <div className="mt-8 p-4 bg-slate-50 border border-slate-200 rounded-xl">
        <p className="text-sm text-slate-600 flex items-center gap-2">
          <span className="flex items-center"><Info size={16} /></span> Este registro de auditoría registra todas las operaciones de creación, actualización, eliminación y anulación.
          Los cambios se comparan antes/después para seguimiento forense completo.
        </p>
      </div>
    </div>
  );
};
