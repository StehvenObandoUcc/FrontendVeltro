import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { nameField, taxIdField, emailOptionalField, phoneField, addressField, notesField } from '../../utils/validationRules';
import type { Supplier, CreateSupplierRequest } from '../../api/purchasing';
import { purchasingApi } from '../../api/purchasing';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';

// Validation schema — single source of truth from validationRules.ts
const supplierSchema = z.object({
  name: nameField('El nombre de empresa'),
  taxId: taxIdField(),
  email: emailOptionalField(),
  phone: phoneField(),
  address: addressField(),
  notes: notesField(255),
});

type SupplierFormData = z.infer<typeof supplierSchema>;

export const SupplierPage: React.FC = () => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [supplierToDelete, setSupplierToDelete] = useState<Supplier | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<SupplierFormData>({
    resolver: zodResolver(supplierSchema),
  });

  const fetchSuppliers = async () => {
    setIsLoading(true);
    try {
      const response = await purchasingApi.getSuppliers();
      setSuppliers(response);
    } catch (err) {
      console.error('Failed to fetch suppliers:', err);
      setError('Error al cargar proveedores');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleOpenForm = (supplier?: Supplier) => {
    if (supplier) {
      setEditingSupplier(supplier);
      reset({
        name: supplier.name,
        taxId: supplier.taxId,
        email: supplier.email || '',
        phone: supplier.phone || '',
        address: supplier.address || '',
        notes: supplier.notes || '',
      });
    } else {
      setEditingSupplier(null);
      reset({
        name: '',
        taxId: '',
        email: '',
        phone: '',
        address: '',
        notes: '',
      });
    }
    setShowForm(true);
    setError(null);
  };

  const handleCloseForm = () => {
    setShowForm(false);
    setEditingSupplier(null);
    reset();
    setError(null);
  };

  const onSubmit = async (data: SupplierFormData) => {
    setIsSaving(true);
    setError(null);

    const supplierData: CreateSupplierRequest = {
      name: data.name,
      taxId: data.taxId,
      email: data.email || undefined,
      phone: data.phone || undefined,
      address: data.address || undefined,
      notes: data.notes || undefined,
    };

    try {
      if (editingSupplier) {
        await purchasingApi.updateSupplier(editingSupplier.id, supplierData);
        setSuccessMessage('Proveedor actualizado correctamente');
      } else {
        await purchasingApi.createSupplier(supplierData);
        setSuccessMessage('Proveedor creado correctamente');
      }
      handleCloseForm();
      fetchSuppliers();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : 'Error al guardar el proveedor';
      setError(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (supplier: Supplier) => {
    setSupplierToDelete(supplier);
  };

  const confirmDeleteSupplier = async () => {
    if (!supplierToDelete) return;
    try {
      await purchasingApi.deleteSupplier(supplierToDelete.id);
      setSuccessMessage('Proveedor eliminado correctamente');
      fetchSuppliers();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to delete supplier:', err);
      setError('Error al eliminar el proveedor');
    } finally {
      setSupplierToDelete(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)] tracking-tight">
            Proveedores
          </h1>
          <p className="mt-1 text-[var(--text-secondary)] text-sm">
            Gestiona los proveedores para órdenes de compra
          </p>
        </div>
        <button
          onClick={() => handleOpenForm()}
          className="btn-primary"
        >
          + Nuevo Proveedor
        </button>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="p-4 rounded-xl bg-green-50 border border-green-200 text-green-600 shadow-sm">
          {successMessage}
        </div>
      )}

      {/* Error Message */}
      {error && !showForm && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-600 shadow-sm">
          {error}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="card p-6 mb-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-4">
            {editingSupplier ? 'Editar Proveedor' : 'Nuevo Proveedor'}
          </h2>

          {error && (
            <div className="p-4 rounded-xl mb-4 bg-red-50 border border-red-200 text-red-600 shadow-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
                  Nombre de Empresa *
                </label>
                <input
                  type="text"
                  maxLength={100}
                  {...register('name')}
                  className="input-base"
                  placeholder="Ej. Distribuidora ABC"
                />
                {errors.name && (
                  <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
                  RUC / Tax ID *
                </label>
                <input
                  type="text"
                  maxLength={20}
                  {...register('taxId')}
                  className="input-base font-mono"
                  placeholder="Ej. 900123456-7"
                  disabled={!!editingSupplier}
                />
                {errors.taxId && (
                  <p className="mt-1 text-sm text-red-500">{errors.taxId.message}</p>
                )}
                {editingSupplier && (
                  <p className="mt-1 text-xs text-[var(--text-secondary)]">
                    El Tax ID no puede ser modificado
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  maxLength={30}
                  {...register('email')}
                  className="input-base"
                  placeholder="contacto@empresa.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
                  Teléfono
                </label>
                <input
                  type="text"
                  maxLength={20}
                  {...register('phone')}
                  className="input-base"
                  placeholder="+57 300 123 4567"
                />
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-500">{errors.phone.message}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
                Dirección
              </label>
              <input
                type="text"
                maxLength={20}
                {...register('address')}
                className="input-base"
                placeholder="Cra 15 # 93-75, Bogotá"
              />
              {errors.address && (
                <p className="mt-1 text-sm text-red-500">{errors.address.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-[var(--text-primary)] mb-1.5">
                Notas
              </label>
              <textarea
                {...register('notes')}
                rows={2}
                maxLength={255}
                className="input-base resize-none"
                placeholder="Notas adicionales sobre el proveedor..."
              />
              {errors.notes && (
                <p className="mt-1 text-sm text-red-500">{errors.notes.message}</p>
              )}
            </div>

            <div className="flex justify-end space-x-3 pt-4 border-t border-[var(--border-light)]">
              <button
                type="button"
                onClick={handleCloseForm}
                className="btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="btn-primary"
              >
                {isSaving ? 'Guardando...' : editingSupplier ? 'Actualizar' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Suppliers Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-[var(--text-secondary)]">
            Cargando proveedores...
          </div>
        ) : suppliers.length === 0 ? (
          <div className="p-8 text-center text-[var(--text-secondary)]">
            No hay proveedores registrados
          </div>
        ) : (
          <table className="w-full table-fixed">
            <colgroup>
              <col style={{ width: '35%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '28%' }} />
              <col style={{ width: '17%' }} />
            </colgroup>
            <thead className="bg-[var(--surface-secondary)] border-b border-[var(--border-light)]">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)]">
                  Empresa
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)]">
                  RUC/NIT
                </th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--text-primary)]">
                  Contacto
                </th>
                <th className="px-4 py-3 text-right text-sm font-semibold text-[var(--text-primary)]">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-light)]">
              {suppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-[var(--surface-secondary)] transition-colors">
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--text-primary)] truncate" title={supplier.name}>
                      {supplier.name}
                    </div>
                    {supplier.address && (
                      <div className="text-sm text-[var(--text-secondary)] truncate" title={supplier.address}>
                        {supplier.address}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-[var(--text-secondary)] truncate">
                    {supplier.taxId}
                  </td>
                  <td className="px-4 py-3">
                    {supplier.email && (
                      <div className="text-sm text-[var(--text-primary)] truncate" title={supplier.email}>{supplier.email}</div>
                    )}
                    {supplier.phone && (
                      <div className="text-sm text-[var(--text-secondary)]">{supplier.phone}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleOpenForm(supplier)}
                      className="text-sm text-[var(--primary)] hover:underline mr-3"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => handleDelete(supplier)}
                      className="text-sm text-red-500 hover:underline"
                    >
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <ConfirmDialog
        isOpen={supplierToDelete !== null}
        title="Eliminar proveedor"
        message={`¿Eliminar el proveedor "${supplierToDelete?.name ?? ''}"?`}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        variant="danger"
        onConfirm={confirmDeleteSupplier}
        onCancel={() => setSupplierToDelete(null)}
      />
    </div>
  );
};

