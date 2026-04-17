import { useState, useEffect, useRef } from 'react';
import { ArrowLeft } from 'lucide-react';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import type { AxiosError } from 'axios';
import { authApi } from '../../api/auth';
import type { ApiError } from '../../types';

const registerSchema = z
  .object({
    username: z
      .string()
      .min(3, 'El usuario debe tener al menos 3 caracteres')
      .max(50, 'El usuario no puede exceder 50 caracteres'),
    email: z.string().email('Ingrese un email valido'),
    password: z
      .string()
      .min(8, 'La contraseña debe tener al menos 8 caracteres')
      .max(64, 'La contraseña no puede exceder 64 caracteres')
      .refine((value) => !/\s/.test(value), 'La contraseña no puede contener espacios'),
    confirmPassword: z.string().min(1, 'Confirme su contraseña'),
    role: z.enum(['ADMIN', 'WAREHOUSE', 'CASHIER'], {
      required_error: 'Seleccione un rol',
      invalid_type_error: 'Seleccione un rol'
    }),
    businessName: z
      .string()
      .min(2, 'El nombre del negocio debe tener al menos 2 caracteres')
      .max(100, 'El nombre del negocio no puede exceder 100 caracteres')
      .optional(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  })
  .refine((data) => data.role !== 'ADMIN' || (data.businessName && data.businessName.length >= 2), {
    message: 'El nombre del negocio es requerido para administradores',
    path: ['businessName'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

export function RegisterPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const redirectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (redirectTimerRef.current) {
        clearTimeout(redirectTimerRef.current);
      }
    };
  }, []);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: 'ADMIN',
    },
  });

  const selectedRole = watch('role');

  const onSubmit = async (data: RegisterFormData) => {
    setError(null);
    setIsLoading(true);

    try {
      await authApi.register({
        username: data.username,
        email: data.email,
        password: data.password,
        role: data.role,
        businessName: data.businessName,
      });

      setSuccess(true);
      redirectTimerRef.current = setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      const axiosError = err as AxiosError<ApiError>;
      if (axiosError.response?.status === 400) {
        setError(axiosError.response.data?.message || 'El usuario ya existe o los datos no son validos');
      } else if (axiosError.response?.data?.message) {
        setError(axiosError.response.data.message);
      } else {
        setError('Error al registrar usuario. Intente nuevamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FEFAF1] p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 sm:p-10 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Registro exitoso</h2>
          <p className="text-gray-600 mb-4">Tu cuenta ha sido creada correctamente.</p>
          <p className="text-sm text-gray-500">Redirigiendo al login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FEFAF1] p-4 relative">
      <Link
        to="/"
        className="absolute top-8 left-8 flex items-center gap-2 text-gray-500 hover:text-[#038E57] transition-colors group"
      >
        <div className="p-2 rounded-full bg-white shadow-sm border border-gray-100 group-hover:border-[#038E57]/30 transition-all">
          <ArrowLeft className="w-5 h-5" />
        </div>
        <span className="font-medium hidden sm:block">Volver al inicio</span>
      </Link>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-gray-100 p-8 sm:p-10">
        <div className="mb-8 flex flex-col items-center gap-2">
          <div className="w-12 h-12 bg-[#038E57] rounded-xl flex items-center justify-center shadow-md mb-2">
            <span className="text-white font-bold text-xl">V</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Crear cuenta</h1>
          <p className="text-sm font-medium text-gray-500">Registro de nuevo usuario</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <div className="flex flex-col gap-1.5 mb-4">
            <label htmlFor="username" className="text-sm font-semibold text-gray-700">
              Usuario
            </label>
            <input
              id="username"
              type="text"
              autoComplete="username"
              maxLength={50}
              {...register('username')}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-[#038E57]/20 focus:border-[#038E57] transition-all duration-200"
              placeholder="tu_usuario"
            />
            {errors.username && (
              <p className="text-xs font-medium text-red-500 mt-1">{errors.username.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5 mb-4">
            <label htmlFor="email" className="text-sm font-semibold text-gray-700">
              Correo electronico
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register('email')}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-[#038E57]/20 focus:border-[#038E57] transition-all duration-200"
              placeholder="tu@email.com"
            />
            {errors.email && (
              <p className="text-xs font-medium text-red-500 mt-1">{errors.email.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5 mb-4">
            <label htmlFor="password" className="text-sm font-semibold text-gray-700">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              maxLength={64}
              {...register('password')}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-[#038E57]/20 focus:border-[#038E57] transition-all duration-200"
              placeholder="Minimo 8 caracteres"
            />
            {errors.password && (
              <p className="text-xs font-medium text-red-500 mt-1">{errors.password.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5 mb-4">
            <label htmlFor="confirmPassword" className="text-sm font-semibold text-gray-700">
              Confirmar contraseña
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...register('confirmPassword')}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-[#038E57]/20 focus:border-[#038E57] transition-all duration-200"
              placeholder="Repite tu contraseña"
            />
            {errors.confirmPassword && (
              <p className="text-xs font-medium text-red-500 mt-1">{errors.confirmPassword.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5 mb-4">
            <label htmlFor="role" className="text-sm font-semibold text-gray-700">
              Tipo de cuenta
            </label>
            <select
              id="role"
              {...register('role')}
              className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-[#038E57]/20 focus:border-[#038E57] transition-all duration-200"
            >
              <option value="ADMIN">Administrador</option>
              <option value="WAREHOUSE">Almacen</option>
              <option value="CASHIER">Cajero</option>
            </select>
            {errors.role && (
              <p className="text-xs font-medium text-red-500 mt-1">{errors.role.message}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              {selectedRole === 'ADMIN' && 'Acceso completo: usuarios, reportes, inventario, ventas y auditoria.'}
              {selectedRole === 'WAREHOUSE' && 'Gestion de productos, proveedores, ordenes de compra e inventario.'}
              {selectedRole === 'CASHIER' && 'Punto de venta, escaneo de productos y consulta de stock.'}
            </p>
          </div>

          {selectedRole === 'ADMIN' && (
            <div className="flex flex-col gap-1.5 mb-4">
              <label htmlFor="businessName" className="text-sm font-semibold text-gray-700">
                Nombre del negocio
              </label>
              <input
                id="businessName"
                type="text"
                {...register('businessName')}
                className="w-full px-4 py-3 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-[#038E57]/20 focus:border-[#038E57] transition-all duration-200"
                placeholder="Mi tienda"
              />
              {errors.businessName && (
                <p className="text-xs font-medium text-red-500 mt-1">{errors.businessName.message}</p>
              )}
              <p className="text-xs text-gray-500 mt-1">
                Este sera el nombre de tu negocio en el sistema.
              </p>
            </div>
          )}

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-50 border border-red-200">
              <p className="text-sm text-red-600 font-medium text-center">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-6 py-3 px-4 bg-[#038E57] hover:bg-[#027A4B] text-white font-bold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 flex justify-center items-center outline-none border-none disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <svg
                className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
            ) : null}
            {isLoading ? 'Registrando...' : 'Crear cuenta'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-sm text-gray-600">
            Ya tienes cuenta?{' '}
            <Link to="/login" className="text-[#038E57] font-semibold hover:underline">
              Iniciar sesion
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
