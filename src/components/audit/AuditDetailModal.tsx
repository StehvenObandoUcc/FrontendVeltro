import React from 'react';
import type { AuditRecord } from '../../api/audit';
import { DiffViewer } from './DiffViewer';

interface AuditDetailModalProps {
  record: AuditRecord;
  isOpen: boolean;
  onClose: () => void;
}

/**
 * AuditDetailModal - Display detailed audit record with diff viewer
 */
export const AuditDetailModal: React.FC<AuditDetailModalProps> = ({
  record,
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  const actionColors: Record<string, { bg: string; border: string; text: string }> = {
    CONFIRM: { bg: '#E8F4F0', border: '#10B981', text: '#038E57' },
    RECEIVE: { bg: '#E0E7FF', border: '#4F46E5', text: '#4F46E5' },
    ADJUST: { bg: '#FFF4E6', border: '#FF9500', text: '#FF9500' },
    VOID: { bg: '#F3F4F6', border: '#6B7280', text: '#6B7280' },
  };

  const entityColors: Record<string, { bg: string; border: string; text: string }> = {
    SALE: { bg: '#F3E8FF', border: '#7C3AED', text: '#7C3AED' },
    INVENTORY: { bg: '#E0E7FF', border: '#4F46E5', text: '#4F46E5' },
    PURCHASE_ORDER: { bg: '#CFFAFE', border: '#06B6D4', text: '#06B6D4' },
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 p-4" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="rounded-lg max-w-4xl w-full max-h-96 overflow-y-auto" style={{ backgroundColor: '#FFFFFF', border: '1px solid #E8E3DB' }}>
        {/* Header */}
        <div className="sticky top-0 px-6 py-4 flex justify-between items-center" style={{ backgroundColor: '#F9F7F2', borderBottom: '1px solid #E8E3DB' }}>
          <div>
            <h2 className="text-xl font-bold" style={{ color: '#1F2937' }}>
              Audit Record Detail
            </h2>
            <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
              Entity ID: {record.entityId}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-2xl leading-none transition-colors"
            style={{ color: '#6B7280' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.color = '#1F2937';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.color = '#6B7280';
            }}
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Metadata Section */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium" style={{ color: '#6B7280' }}>
                Action
              </label>
              <div className="mt-1 inline-block px-3 py-1 rounded" style={actionColors[record.action]}>
                {record.action}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium" style={{ color: '#6B7280' }}>
                Entity Type
              </label>
              <div className="mt-1 inline-block px-3 py-1 rounded" style={entityColors[record.entityType]}>
                {record.entityType}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium" style={{ color: '#6B7280' }}>
                User
              </label>
              <p className="mt-1 text-sm" style={{ color: '#1F2937' }}>
                {record.username}
              </p>
            </div>

            <div>
              <label className="text-sm font-medium" style={{ color: '#6B7280' }}>
                Timestamp
              </label>
              <p className="mt-1 text-sm" style={{ color: '#1F2937' }}>
                {new Date(record.createdAt).toLocaleString()}
              </p>
            </div>

            {record.ipAddress && (
              <div className="col-span-2">
                <label className="text-sm font-medium" style={{ color: '#6B7280' }}>
                  IP Address
                </label>
                <p className="mt-1 text-sm" style={{ color: '#1F2937' }}>{record.ipAddress}</p>
              </div>
            )}
          </div>

          {/* Diff Section */}
          <div>
            <h3 className="text-lg font-semibold mb-3" style={{ color: '#1F2937' }}>
              Changes Made
            </h3>
            <DiffViewer
              previousData={record.previousData ? JSON.parse(record.previousData) : {}}
              newData={record.newData ? JSON.parse(record.newData) : {}}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 px-6 py-4 flex justify-end" style={{ backgroundColor: '#F9F7F2', borderTop: '1px solid #E8E3DB' }}>
          <button
             onClick={onClose}
             className="px-4 py-2 rounded-md font-medium transition-colors"
             style={{
               backgroundColor: '#FFAC00',
               color: '#FFFFFF',
             }}
             onMouseEnter={(e) => {
               e.currentTarget.style.opacity = '0.9';
             }}
             onMouseLeave={(e) => {
               e.currentTarget.style.opacity = '1';
             }}
           >
             Close
           </button>
        </div>
      </div>
    </div>
  );
};
