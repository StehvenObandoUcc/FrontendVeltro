import { Link } from 'react-router-dom';
import { ShieldOff } from 'lucide-react';

export function UnauthorizedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="flex justify-center mb-4">
          <ShieldOff className="w-16 h-16 text-red-500" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Acceso Denegado</h1>
        <p className="text-gray-600 mb-6">
          No tiene permisos para acceder a esta página.
        </p>
        <Link
          to="/"
          className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Volver al Inicio
        </Link>
      </div>
    </div>
  );
}

export function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
        <div className="text-6xl mb-4">404</div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Página No Encontrada</h1>
        <p className="text-gray-600 mb-6">
          La página que busca no existe o ha sido movida.
        </p>
        <Link
          to="/"
          className="inline-block bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
        >
          Volver al Inicio
        </Link>
      </div>
    </div>
  );
}
