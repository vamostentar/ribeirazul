import { cn } from '@/utils/cn';
import { useEffect, useState } from 'react';

interface PasswordStrengthProps {
  password: string;
  className?: string;
}

interface StrengthLevel {
  score: number;
  label: string;
  color: string;
}

const PasswordStrength = ({ password, className }: PasswordStrengthProps) => {
  const [strength, setStrength] = useState<StrengthLevel>({ score: 0, label: '', color: '' });

  useEffect(() => {
    const calculateStrength = (password: string): StrengthLevel => {
      if (!password) {
        return { score: 0, label: '', color: '' };
      }

      let score = 0;
      const checks = {
        length: password.length >= 8,
        lowercase: /[a-z]/.test(password),
        uppercase: /[A-Z]/.test(password),
        numbers: /\d/.test(password),
        symbols: /[!@#$%^&*(),.?":{}|<>]/.test(password),
      };

      // Calculate score based on checks
      score = Object.values(checks).filter(Boolean).length;

      // Bonus for length
      if (password.length >= 12) score += 1;
      if (password.length >= 16) score += 1;

      // Determine strength level
      if (score <= 2) {
        return { score, label: 'Fraca', color: 'bg-red-500' };
      } else if (score <= 4) {
        return { score, label: 'Média', color: 'bg-yellow-500' };
      } else if (score <= 6) {
        return { score, label: 'Forte', color: 'bg-green-500' };
      } else {
        return { score, label: 'Muito Forte', color: 'bg-green-600' };
      }
    };

    setStrength(calculateStrength(password));
  }, [password]);

  if (!password) return null;

  const maxScore = 8;
  const percentage = (strength.score / maxScore) * 100;

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-600">Força da senha:</span>
        <span className={cn(
          'font-medium',
          strength.score <= 2 && 'text-red-600',
          strength.score > 2 && strength.score <= 4 && 'text-yellow-600',
          strength.score > 4 && 'text-green-600'
        )}>
          {strength.label}
        </span>
      </div>
      
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div
          className={cn('h-2 rounded-full transition-all duration-300', strength.color)}
          style={{ width: `${percentage}%` }}
        />
      </div>
      
      <div className="text-xs text-gray-500">
        <div className="grid grid-cols-2 gap-1">
          <div className={cn('flex items-center gap-1', password.length >= 8 ? 'text-green-600' : 'text-gray-400')}>
            <div className={cn('w-1 h-1 rounded-full', password.length >= 8 ? 'bg-green-600' : 'bg-gray-400')} />
            Mín. 8 caracteres
          </div>
          <div className={cn('flex items-center gap-1', /[a-z]/.test(password) ? 'text-green-600' : 'text-gray-400')}>
            <div className={cn('w-1 h-1 rounded-full', /[a-z]/.test(password) ? 'bg-green-600' : 'bg-gray-400')} />
            Letra minúscula
          </div>
          <div className={cn('flex items-center gap-1', /[A-Z]/.test(password) ? 'text-green-600' : 'text-gray-400')}>
            <div className={cn('w-1 h-1 rounded-full', /[A-Z]/.test(password) ? 'bg-green-600' : 'bg-gray-400')} />
            Letra maiúscula
          </div>
          <div className={cn('flex items-center gap-1', /\d/.test(password) ? 'text-green-600' : 'text-gray-400')}>
            <div className={cn('w-1 h-1 rounded-full', /\d/.test(password) ? 'bg-green-600' : 'bg-gray-400')} />
            Número
          </div>
        </div>
      </div>
    </div>
  );
};

export { PasswordStrength };

