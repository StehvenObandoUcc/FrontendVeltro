import { useState, forwardRef } from 'react';
import { Eye, EyeOff } from 'lucide-react';

interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  id: string;
  error?: string;
  label?: string;
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ id, error, label, className = '', ...props }, ref) => {
    const [showPassword, setShowPassword] = useState(false);
    return (
      <div className="flex flex-col gap-1.5 mb-4">
        {label && (
          <label htmlFor={id} className="text-sm font-semibold text-gray-700">
            {label}
          </label>
        )}
        <div className="relative">
          <input
            id={id}
            ref={ref}
            type={showPassword ? 'text' : 'password'}
            className={`w-full px-4 py-3 pr-10 rounded-lg border border-gray-200 bg-gray-50 text-gray-900 outline-none focus:bg-white focus:ring-2 focus:ring-[#038E57]/20 focus:border-[#038E57] transition-all duration-200 ${className}`}
            {...props}
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
            aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
        {error && <p className="text-xs font-medium text-red-500 mt-1">{error}</p>}
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
