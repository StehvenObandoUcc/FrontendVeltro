import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import type { AxiosError } from 'axios';
import { useAuth } from '../../hooks/useAuth';
import { authApi } from '../../api/auth';
import type { ApiError, UserRole } from '../../types';
import { Lock, Building2, UserCircle, Mail, KeyRound, ChevronDown, ChevronUp, CheckCircle2, AlertCircle } from 'lucide-react';
import { PasswordInput } from '../../components/common/PasswordInput';

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'La contraseña actual es requerida'),
  newPassword: z
    .string()
    .min(8, 'La nueva contraseña debe tener al menos 8 caracteres')
    .max(20, 'La nueva contraseña no puede exceder 20 caracteres')
    .refine((value) => !/\s/.test(value), 'La contraseña no puede contener espacios'),
  confirmPassword: z.string().min(1, 'Confirma tu nueva contraseña'),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: 'Las contraseñas no coinciden',
  path: ['confirmPassword'],
});

type PasswordFormData = z.infer<typeof passwordSchema>;

export function ProfilePage() {
  const { user } = useAuth();
  const [workerCount, setWorkerCount] = useState<number | null>(null);
  const [workerCountError, setWorkerCountError] = useState(false);
  const [isPasswordFormOpen, setIsPasswordFormOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PasswordFormData>({
    resolver: zodResolver(passwordSchema),
  });

  useEffect(() => {
    if (user?.role === 'ADMIN') {
      const fetchWorkerCount = async () => {
        try {
          setWorkerCountError(false);
          const { count } = await authApi.getWorkerCount();
          setWorkerCount(count);
        } catch (err) {
          console.error("Failed to load worker count", err);
          setWorkerCountError(true);
        }
      };
      fetchWorkerCount();
    }
  }, [user]);

  const onSubmit = async (data: PasswordFormData) => {
    setIsLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      await authApi.changePassword(data.currentPassword, data.newPassword);
      setSuccessMsg('Contraseña actualizada exitosamente');
      reset();
      setIsPasswordFormOpen(false);
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      setErrorMsg(
        axiosError.response?.data?.message ||
        axiosError.response?.data?.error ||
        'Error al cambiar la contraseña. Verifica tu contraseña actual.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleLabel = (role?: UserRole): string => {
    switch (role) {
      case 'ADMIN': return 'Administrador';
      case 'CASHIER': return 'Cajero';
      case 'WAREHOUSE': return 'Almacén';
      default: return role || '';
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Profile Section */}
      <div className="card p-8 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--primary-light)] opacity-[0.03] rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
        
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[var(--primary-light)] to-[var(--primary-base)] flex items-center justify-center text-4xl font-bold text-white shadow-lg flex-shrink-0">
          {user.username.charAt(0).toUpperCase()}
        </div>
        
        <div>
          <h1 className="text-3xl font-bold text-[var(--text-primary)] mb-1">
            {user.username}
          </h1>
          <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-4 mt-2">
            <span className="badge badge-success px-3 py-1 text-sm font-medium">
              {getRoleLabel(user.role)}
            </span>
            <span className="text-[var(--text-secondary)] flex items-center gap-1.5 text-sm">
              <Mail size={16} />
              {user.email}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Contextual Info Card (Business or Assignment) */}
        <div className="card p-6 h-full transition-transform hover:-translate-y-1 duration-300">
          <div className="flex items-center gap-2 mb-4 border-b border-[var(--border-light)] pb-3">
            <Building2 className="text-[var(--primary-base)]" size={20} />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">
              {user.role === 'ADMIN' ? 'Mi Negocio' : 'Mi Asignación'}
            </h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
                {user.role === 'ADMIN' ? 'Nombre del Negocio' : 'Tienda Asociada'}
              </p>
              <p className="text-sm font-medium text-[var(--text-primary)]">
                {user.businessName || 'No asignado'}
              </p>
            </div>
            
            {user.role === 'ADMIN' ? (
              <>
                <div>
                  <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
                    Empleados Registrados
                  </p>
                  <p className="text-sm font-medium text-[var(--text-primary)] flex items-center gap-2">
                    {workerCount !== null ? (
                      <span className="badge badge-info bg-blue-50 text-blue-700 font-bold px-2.5 py-0.5 rounded">
                        {workerCount}
                      </span>
                    ) : workerCountError ? (
                      <span className="text-red-500 text-xs font-semibold">Error al cargar</span>
                    ) : (
                      <span className="text-[var(--text-tertiary)] text-xs">Cargando...</span>
                    )}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
                    ID del Negocio
                  </p>
                  <p className="text-sm font-medium text-[var(--text-primary)] tabular-nums">
                    {user.businessId || '-'}
                  </p>
                </div>
              </>
            ) : (
              <div>
                <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
                  Administrador / Jefe
                </p>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {user.adminName || 'No asignado'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Account Info Card (Read Only) */}
        <div className="card p-6 h-full transition-transform hover:-translate-y-1 duration-300">
          <div className="flex items-center gap-2 mb-4 border-b border-[var(--border-light)] pb-3">
            <UserCircle className="text-[var(--primary-base)]" size={20} />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Mi Cuenta</h2>
          </div>
          
          <div className="space-y-4">
            <div className="group">
              <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
                Correo Electrónico
              </p>
              <div className="flex items-center justify-between p-2.5 bg-[var(--surface-primary)] border border-[var(--border-light)] rounded-md opacity-80 cursor-not-allowed">
                <span className="text-sm font-medium text-[var(--text-primary)]">{user.email}</span>
                <Lock size={14} className="text-[var(--text-tertiary)]" />
              </div>
            </div>

            <div className="group">
              <p className="text-xs font-semibold text-[var(--text-tertiary)] uppercase tracking-wider mb-1">
                Rol
              </p>
              <div className="flex items-center justify-between p-2.5 bg-[var(--surface-primary)] border border-[var(--border-light)] rounded-md opacity-80 cursor-not-allowed">
                <span className="text-sm font-medium text-[var(--text-primary)]">{getRoleLabel(user.role)}</span>
                <Lock size={14} className="text-[var(--text-tertiary)]" />
              </div>
            </div>

            <p className="text-xs text-[var(--text-tertiary)] flex items-start gap-1.5 mt-4">
              <Lock size={12} className="mt-0.5 flex-shrink-0" />
              Para modificar estos datos, contacta a tu administrador de sistema o soporte técnico.
            </p>
          </div>
        </div>
      </div>

      {/* Security / Password Change Section */}
      <div className="card overflow-hidden">
        <button 
          onClick={() => setIsPasswordFormOpen(!isPasswordFormOpen)}
          className="w-full p-6 flex items-center justify-between hover:bg-[rgba(3,142,87,0.02)] transition-colors focus:outline-none"
        >
          <div className="flex items-center gap-2">
            <KeyRound className="text-[var(--primary-base)]" size={20} />
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Seguridad</h2>
          </div>
          <div className="flex items-center gap-2 text-sm font-medium text-[var(--primary-base)]">
            Cambiar contraseña
            {isPasswordFormOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
          </div>
        </button>

        {isPasswordFormOpen && (
          <div className="p-6 pt-0 border-t border-[var(--border-light)] mt-2">
            
            {successMsg && (
              <div className="mb-6 p-4 rounded-lg bg-green-50 border border-green-200 flex items-start gap-3 mt-4">
                <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-700 font-medium">{successMsg}</p>
              </div>
            )}

            {errorMsg && (
              <div className="mb-6 p-4 rounded-lg bg-red-50 border border-red-200 flex items-start gap-3 mt-4">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-600 font-medium">{errorMsg}</p>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 max-w-md mt-4">
              <PasswordInput
                id="currentPassword"
                label="Contraseña actual"
                autoComplete="current-password"
                maxLength={20}
                placeholder="••••••••"
                error={errors.currentPassword?.message}
                {...register('currentPassword')}
              />

              <PasswordInput
                id="newPassword"
                label="Nueva contraseña"
                autoComplete="new-password"
                maxLength={20}
                placeholder="Mínimo 8 caracteres"
                error={errors.newPassword?.message}
                {...register('newPassword')}
              />

              <PasswordInput
                id="confirmPassword"
                label="Confirmar nueva contraseña"
                autoComplete="new-password"
                maxLength={20}
                placeholder="Repite tu nueva contraseña"
                error={errors.confirmPassword?.message}
                {...register('confirmPassword')}
              />

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="btn-primary disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Guardando...
                    </>
                  ) : (
                    'Guardar contraseña'
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
