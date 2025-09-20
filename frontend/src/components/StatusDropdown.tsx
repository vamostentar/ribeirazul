import { Check, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface StatusDropdownProps {
  value: 'ACTIVE' | 'PENDING' | 'INACTIVE';
  onChange: (value: 'ACTIVE' | 'PENDING' | 'INACTIVE') => void;
  disabled?: boolean;
  className?: string;
}

const statusOptions = [
  { value: 'ACTIVE' as const, label: 'Ativo', color: 'text-green-600', bgColor: 'bg-green-50', borderColor: 'border-green-200' },
  { value: 'PENDING' as const, label: 'Pendente', color: 'text-yellow-600', bgColor: 'bg-yellow-50', borderColor: 'border-yellow-200' },
  { value: 'INACTIVE' as const, label: 'Inativo', color: 'text-red-600', bgColor: 'bg-red-50', borderColor: 'border-red-200' },
];

export function StatusDropdown({ value, onChange, disabled = false, className = '' }: StatusDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = statusOptions.find(option => option.value === value) || statusOptions[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (optionValue: 'ACTIVE' | 'PENDING' | 'INACTIVE') => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          w-full min-w-[120px] px-3 py-2 text-sm font-medium rounded-lg border transition-all duration-200
          flex items-center justify-between gap-2
          ${selectedOption.bgColor} ${selectedOption.borderColor} ${selectedOption.color}
          ${disabled 
            ? 'opacity-50 cursor-not-allowed' 
            : 'hover:shadow-sm hover:scale-[1.02] cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1'
          }
        `}
      >
        <span className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${
            value === 'ACTIVE' ? 'bg-green-500' : 
            value === 'PENDING' ? 'bg-yellow-500' : 
            'bg-red-500'
          }`} />
          {selectedOption.label}
        </span>
        <ChevronDown 
          className={`w-4 h-4 transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`} 
        />
      </button>

      {isOpen && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 overflow-hidden">
          {statusOptions.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSelect(option.value)}
              className={`
                w-full px-3 py-2 text-sm text-left transition-colors duration-150
                flex items-center justify-between gap-2
                ${option.bgColor} ${option.color}
                hover:bg-opacity-80 focus:outline-none focus:bg-opacity-80
                ${value === option.value ? 'font-semibold' : 'font-normal'}
              `}
            >
              <span className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${
                  option.value === 'ACTIVE' ? 'bg-green-500' : 
                  option.value === 'PENDING' ? 'bg-yellow-500' : 
                  'bg-red-500'
                }`} />
                {option.label}
              </span>
              {value === option.value && (
                <Check className="w-4 h-4" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
