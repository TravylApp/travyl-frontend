import { forwardRef, InputHTMLAttributes, ReactNode, useRef } from 'react';
import { AlertCircle, Check } from 'lucide-react';

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'prefix'> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  optional?: boolean;
  prefixIcon?: ReactNode;
  suffixIcon?: ReactNode;
  isValid?: boolean;
  isLoading?: boolean;
  characterCount?: number;
  maxCharacters?: number;
  fullWidth?: boolean;
  onPrefixIconClick?: () => void;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      required,
      optional,
      prefixIcon,
      suffixIcon,
      isValid,
      isLoading,
      characterCount,
      maxCharacters,
      fullWidth = true,
      className = '',
      disabled,
      onPrefixIconClick,
      ...props
    },
    ref
  ) => {
    const internalRef = useRef<HTMLInputElement>(null);
    const inputRef = (ref as any) || internalRef;

    const handlePrefixIconClick = () => {
      if (onPrefixIconClick) {
        onPrefixIconClick();
      } else if (inputRef.current) {
        inputRef.current.focus();
      }
    };

    const hasError = Boolean(error);
    const showValidIcon = isValid && !hasError && !disabled;
    const showErrorIcon = hasError && !disabled;

    return (
      <div className={`${fullWidth ? 'w-full' : ''}`}>
        {/* Label */}
        {label && (
          <label
            htmlFor={props.id}
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {label}
            {required && <span className="text-red-600 ml-1" aria-label="required">*</span>}
            {optional && !required && (
              <span className="text-gray-500 text-xs ml-1 font-normal">(optional)</span>
            )}
          </label>
        )}

        {/* Input Container */}
        <div className="relative">
          {/* Prefix Icon */}
          {prefixIcon && (
            <button
              type="button"
              onClick={handlePrefixIconClick}
              disabled={disabled}
              className={`absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors ${
                disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:text-gray-600'
              }`}
              aria-label="Focus input"
              tabIndex={-1}
            >
              {prefixIcon}
            </button>
          )}

          {/* Input Field */}
          <input
            ref={inputRef}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={
              error ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined
            }
            className={`
              w-full px-3 py-2.5 
              border rounded-lg
              text-gray-900 placeholder-gray-400
              transition-all duration-200
              ${prefixIcon ? 'pl-10' : ''}
              ${suffixIcon || showValidIcon || showErrorIcon || isLoading ? 'pr-10' : ''}
              ${
                hasError
                  ? 'border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100 bg-red-50/50'
                  : showValidIcon
                  ? 'border-green-300 focus:border-green-400 focus:ring-2 focus:ring-green-100 bg-green-50/50'
                  : 'border-gray-200 focus:border-blue-400 focus:ring-2 focus:ring-blue-100'
              }
              ${
                disabled
                  ? 'bg-gray-50 text-gray-500 cursor-not-allowed opacity-60'
                  : 'bg-white hover:border-gray-300'
              }
              focus:outline-none
              ${className}
            `}
            {...props}
          />

          {/* Suffix Icons */}
          {(suffixIcon || showValidIcon || showErrorIcon || isLoading) && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {isLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent" />
              )}
              {!isLoading && showValidIcon && (
                <Check size={18} className="text-green-600" aria-label="valid input" />
              )}
              {!isLoading && showErrorIcon && (
                <AlertCircle size={18} className="text-red-600" aria-label="invalid input" />
              )}
              {!isLoading && !showValidIcon && !showErrorIcon && suffixIcon && (
                <span className="text-gray-400">{suffixIcon}</span>
              )}
            </div>
          )}
        </div>

        {/* Character Count */}
        {maxCharacters && (
          <div className="flex justify-end mt-1">
            <span
              className={`text-xs ${
                characterCount && characterCount > maxCharacters
                  ? 'text-red-600'
                  : 'text-gray-500'
              }`}
            >
              {characterCount || 0} / {maxCharacters}
            </span>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <p
            id={`${props.id}-error`}
            className="mt-1.5 text-sm text-red-600 flex items-start gap-1 animate-in fade-in slide-in-from-top-1 duration-200"
            role="alert"
          >
            <AlertCircle size={14} className="mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </p>
        )}

        {/* Helper Text */}
        {helperText && !error && (
          <p
            id={`${props.id}-helper`}
            className="mt-1.5 text-sm text-gray-600"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';