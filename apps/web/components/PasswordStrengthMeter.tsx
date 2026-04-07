import { useMemo } from 'react';
import { Check, X } from 'lucide-react';

interface PasswordStrengthMeterProps {
  password: string;
}

interface Requirement {
  label: string;
  met: boolean;
}

function getRequirements(password: string): Requirement[] {
  return [
    { label: 'At least 8 characters', met: password.length >= 8 },
    { label: 'Uppercase letter (A-Z)', met: /[A-Z]/.test(password) },
    { label: 'Lowercase letter (a-z)', met: /[a-z]/.test(password) },
    { label: 'Number (0-9)', met: /[0-9]/.test(password) },
    { label: 'Special character (!@#$...)', met: /[^A-Za-z0-9]/.test(password) },
  ];
}

function getStrength(requirements: Requirement[]): number {
  return requirements.filter(r => r.met).length;
}

const STRENGTH_CONFIG: Record<number, { label: string; color: string; barColor: string }> = {
  0: { label: '', color: 'text-gray-400', barColor: 'bg-gray-200' },
  1: { label: 'Very Weak', color: 'text-red-600', barColor: 'bg-red-500' },
  2: { label: 'Weak', color: 'text-orange-600', barColor: 'bg-orange-500' },
  3: { label: 'Fair', color: 'text-amber-600', barColor: 'bg-amber-500' },
  4: { label: 'Good', color: 'text-blue-600', barColor: 'bg-blue-500' },
  5: { label: 'Strong', color: 'text-green-600', barColor: 'bg-green-500' },
};

export function PasswordStrengthMeter({ password }: PasswordStrengthMeterProps) {
  const requirements = useMemo(() => getRequirements(password), [password]);
  const strength = useMemo(() => getStrength(requirements), [requirements]);
  const config = STRENGTH_CONFIG[strength];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2.5" role="status" aria-live="polite" aria-label={`Password strength: ${config.label}`}>
      {/* Strength bar */}
      <div className="flex items-center gap-2.5">
        <div className="flex-1 flex gap-1">
          {[1, 2, 3, 4, 5].map((segment) => (
            <div
              key={segment}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                segment <= strength ? config.barColor : 'bg-gray-200'
              }`}
            />
          ))}
        </div>
        <span className={`text-xs font-medium transition-colors duration-300 min-w-[72px] text-right ${config.color}`}>
          {config.label}
        </span>
      </div>

      {/* Requirements checklist */}
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
        {requirements.map((req) => (
          <li
            key={req.label}
            className={`flex items-center gap-1.5 text-xs transition-colors duration-200 ${
              req.met ? 'text-green-700' : 'text-gray-500'
            }`}
          >
            {req.met ? (
              <Check size={12} className="text-green-600 flex-shrink-0" aria-hidden="true" />
            ) : (
              <X size={12} className="text-gray-400 flex-shrink-0" aria-hidden="true" />
            )}
            <span>{req.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
