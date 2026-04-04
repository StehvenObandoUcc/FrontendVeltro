import { useState, useEffect, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { AxiosError } from 'axios';
import { authApi } from '../../api/auth';
import type { ApiError, Worker } from '../../types';

const workerSchema = z.object({
  username: z
    .string()
    .min(3, 'El usuario debe tener al menos 3 caracteres')
    .max(20, 'El usuario no puede exceder 20 caracteres'),
  email: z.string().email('Ingrese un email válido'),
  password: z
    .string()
    .min(8, 'La contraseña debe tener al menos 8 caracteres')
    .max(20, 'La contraseña no puede exceder 20 caracteres')
    .refine((value) => !/\s/.test(value), 'La contraseña no puede contener espacios'),
  confirmPassword: z.string().min(1, 'Confirme su contraseña'),
  role: z.enum(['WAREHOUSE', 'CASHIER'], {
    required_error: 'Seleccione un rol',
    invalid_type_error: 'Seleccione un rol'
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type WorkerFormData = z.infer<typeof workerSchema>;

const getApiErrorMessage = (error: AxiosError<ApiError>, fallback: string): string => {
  return (
    error.response?.data?.message ||
    error.response?.data?.error ||
    error.message ||
    fallback
  );
};

export function WorkersPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingWorkers, setIsLoadingWorkers] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [updatingRoleId, setUpdatingRoleId] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WorkerFormData>({
    resolver: zodResolver(workerSchema),
    defaultValues: {
      role: 'CASHIER',
    },
  });

  const loadWorkers = useCallback(async () => {
    setIsLoadingWorkers(true);
    try {
      const data = await authApi.getWorkers();
      setWorkers(data);
    } catch {
      // Silently fail — list will just be empty
    } finally {
      setIsLoadingWorkers(false);
    }
  }, []);

  useEffect(() => {
    loadWorkers();
  }, [loadWorkers]);

  const handleDelete = async (workerId: number) => {
    setConfirmDeleteId(null);
    setDeletingId(workerId);
    setError(null);
    setSuccess(null);

    try {
      await authApi.deleteWorker(workerId);
      const deletedWorker = workers.find(w => w.id === workerId);
      setSuccess(`Empleado "${deletedWorker?.username}" eliminado exitosamente`);
      await loadWorkers();
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      setError(getApiErrorMessage(axiosError, 'Error al eliminar empleado'));
    } finally {
      setDeletingId(null);
    }
  };

  const handleRoleChange = async (workerId: number, newRole: string) => {
    setUpdatingRoleId(workerId);
    setError(null);
    setSuccess(null);

    try {
      const updated = await authApi.updateWorkerRole(workerId, newRole);
      setWorkers(prev => prev.map(w => w.id === workerId ? { ...w, role: updated.role } : w));
      setSuccess(`Rol de "${updated.username}" actualizado a ${getRoleLabel(updated.role)}`);
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      setError(getApiErrorMessage(axiosError, 'Error al cambiar rol'));
      // Reload to reset the select to the actual value
      await loadWorkers();
    } finally {
      setUpdatingRoleId(null);
    }
  };

  const onSubmit = async (data: WorkerFormData) => {
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const result = await authApi.createWorker({
        username: data.username,
        email: data.email,
        password: data.password,
        role: data.role,
      });

      setSuccess(`Usuario "${result.username}" creado exitosamente como ${getRoleLabel(result.role)}`);
      reset();
      setShowForm(false);
      // Refresh the workers list from the backend
      await loadWorkers();
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      if (axiosError.response?.status === 403) {
        setError('No tienes permisos para crear usuarios');
      } else {
        setError(getApiErrorMessage(axiosError, 'Error al crear usuario. Intente nuevamente.'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleLabel = (role: string): string => {
    switch (role) {
      case 'CASHIER':
        return 'Cajero';
      case 'WAREHOUSE':
        return 'Almacén';
      case 'ADMIN':
        return 'Administrador';
      default:
        return role;
    }
  };

  const formatDate = (dateStr: string): string => {
    try {
      return new Date(dateStr).toLocaleString('es-CO', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de empleados</h1>
          <p className="text-sm text-gray-500 mt-1">
            {workers.length} empleado{workers.length !== 1 ? 's' : ''} en tu negocio
          </p>
        </div>
        <button
          onClick={() => {
            setShowForm(!showForm);
            setError(null);
            setSuccess(null);
          }}
          className="btn-primary inline-flex items-center"
        >
          {showForm ? (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Cancelar
            </>
          ) : (
            <>
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Nuevo empleado
            </>
          )}
        </button>
      </div>

      {success && (
        <div className="p-4 rounded-lg bg-green-50 border border-green-200 flex items-start gap-3">
          <svg className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <p className="text-sm text-green-700 font-medium">{success}</p>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3">
          <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm text-red-600 font-medium">{error}</p>
        </div>
      )}

      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Crear nuevo empleado</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="worker-username" className="text-sm font-semibold text-gray-700">
                  Nombre de usuario
                </label>
                <input
                  id="worker-username"
                  type="text"
                  autoComplete="off"
                  maxLength={20}
                  {...register('username')}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-[#038E57]/20 focus:border-[#038E57] transition-all duration-200 text-sm"
                  placeholder="nombre_usuario"
                />
                {errors.username && <p className="text-xs font-medium text-red-500">{errors.username.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="worker-email" className="text-sm font-semibold text-gray-700">
                  Correo electrónico
                </label>
                <input
                  id="worker-email"
                  type="email"
                  autoComplete="off"
                  {...register('email')}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-[#038E57]/20 focus:border-[#038E57] transition-all duration-200 text-sm"
                  placeholder="usuario@email.com"
                />
                {errors.email && <p className="text-xs font-medium text-red-500">{errors.email.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="worker-password" className="text-sm font-semibold text-gray-700">
                  Contraseña
                </label>
                <input
                  id="worker-password"
                  type="password"
                  autoComplete="new-password"
                  maxLength={20}
                  {...register('password')}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-[#038E57]/20 focus:border-[#038E57] transition-all duration-200 text-sm"
                  placeholder="Minimo 8 caracteres"
                />
                {errors.password && <p className="text-xs font-medium text-red-500">{errors.password.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="worker-confirm-password" className="text-sm font-semibold text-gray-700">
                  Confirmar Contraseña
                </label>
                <input
                  id="worker-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  maxLength={20}
                  {...register('confirmPassword')}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-[#038E57]/20 focus:border-[#038E57] transition-all duration-200 text-sm"
                  placeholder="Repite tu contraseña"
                />
                {errors.confirmPassword && <p className="text-xs font-medium text-red-500">{errors.confirmPassword.message}</p>}
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="worker-role" className="text-sm font-semibold text-gray-700">
                  Rol
                </label>
                <select
                  id="worker-role"
                  {...register('role')}
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-[#038E57]/20 focus:border-[#038E57] transition-all duration-200 text-sm"
                >
                  <option value="CASHIER">Cajero (Punto de venta)</option>
                  <option value="WAREHOUSE">Almacén (Inventario y compras)</option>
                </select>
                {errors.role && <p className="text-xs font-medium text-red-500">{errors.role.message}</p>}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="btn-primary inline-flex items-center disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading && (
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                )}
                {isLoading ? 'Creando...' : 'Crear empleado'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Workers table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Empleados del negocio</h2>
        </div>
        {isLoadingWorkers ? (
          <div className="px-6 py-12 text-center text-gray-500 text-sm">Cargando empleados...</div>
        ) : workers.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400 text-sm">No hay empleados registrados</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {workers.map((worker) => (
              <div key={worker.id} className="px-6 py-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-600 flex-shrink-0">
                    {worker.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{worker.username}</p>
                    <p className="text-xs text-gray-500 truncate">{worker.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="text-xs text-gray-400 hidden lg:inline">
                    {formatDate(worker.createdAt)}
                  </span>

                  {/* Role selector */}
                  <select
                    value={worker.role}
                    onChange={(e) => handleRoleChange(worker.id, e.target.value)}
                    disabled={updatingRoleId === worker.id}
                    className="text-xs font-semibold rounded-full border-0 py-1 pl-2.5 pr-7 cursor-pointer focus:ring-2 focus:ring-[#038E57]/20 disabled:opacity-50 disabled:cursor-not-allowed appearance-none bg-no-repeat bg-[right_0.3rem_center] bg-[length:1rem_1rem]"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 20 20' fill='%236b7280'%3E%3Cpath fill-rule='evenodd' d='M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z' clip-rule='evenodd' /%3E%3C/svg%3E")`,
                    }}
                    title="Cambiar rol"
                  >
                    <option value="CASHIER">Cajero</option>
                     <option value="WAREHOUSE">Almacén</option>
                  </select>

                  {/* Delete button */}
                  <button
                    onClick={() => setConfirmDeleteId(worker.id)}
                    disabled={deletingId === worker.id}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Eliminar empleado"
                  >
                    {deletingId === worker.id ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      {confirmDeleteId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-xl shadow-xl border border-gray-200 max-w-sm w-full p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">Eliminar empleado</h3>
                <p className="text-sm text-gray-500 mt-0.5">
                   Se desactivará la cuenta de <strong>{workers.find(w => w.id === confirmDeleteId)?.username}</strong>. Esta acción se puede revertir.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setConfirmDeleteId(null)}
                className="btn-secondary text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(confirmDeleteId)}
                className="btn-danger text-sm"
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-blue-50 rounded-xl border border-blue-100 p-5">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">Acerca de los roles</p>
            <ul className="space-y-1 text-blue-700">
              <li><strong>Cajero</strong>: acceso al terminal POS, escaneo de productos y consulta de stock.</li>
               <li><strong>Almacén</strong>: gestión de productos, inventario, alertas y órdenes de compra.</li>
            </ul>
            <p className="mt-2 text-xs text-blue-600">
               Los empleados comparten los mismos datos de tu negocio, pero con acceso limitado según su rol.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
