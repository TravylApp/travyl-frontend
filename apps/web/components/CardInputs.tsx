import { forwardRef, InputHTMLAttributes, useState } from 'react';
import { CreditCard, AlertCircle, Check } from 'lucide-react';

export interface CardInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  optional?: boolean;
  isValid?: boolean;
  fullWidth?: boolean;
  onValueChange?: (value: string) => void;
}

export const CardInput = forwardRef<HTMLInputElement, CardInputProps>(
  (
    {
      label,
      error,
      helperText,
      required,
      optional,
      isValid,
      fullWidth = true,
      className = '',
      disabled,
      onValueChange,
      ...props
    },
    ref
  ) => {
    const hasError = Boolean(error);
    const [cardType, setCardType] = useState<string>('');

    const detectCardType = (number: string): string => {
      const cleaned = number.replace(/\s/g, '');
      if (/^4/.test(cleaned)) return 'visa';
      if (/^5[1-5]/.test(cleaned)) return 'mastercard';
      if (/^3[47]/.test(cleaned)) return 'amex';
      if (/^6(?:011|5)/.test(cleaned)) return 'discover';
      return '';
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setCardType(detectCardType(value));
      onValueChange?.(value);
      props.onChange?.(e);
    };

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

        {/* Card Input Container */}
        <div className="relative">
          {/* Card Icon */}
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
            <CreditCard size={18} />
          </div>

          {/* Card Input Field */}
          <input
            ref={ref}
            type="text"
            inputMode="numeric"
            autoComplete="cc-number"
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={
              error ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined
            }
            className={`
              w-full pl-10 pr-10 py-2.5 
              border rounded-lg
              text-gray-900 placeholder-gray-400
              font-mono tracking-wide
              transition-all duration-200
              ${
                hasError
                  ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50'
                  : isValid
                  ? 'border-green-500 focus:border-green-500 focus:ring-2 focus:ring-green-200 bg-green-50'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
              }
              ${
                disabled
                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed opacity-60'
                  : 'bg-white hover:border-gray-400'
              }
              focus:outline-none
              ${className}
            `}
            onChange={handleChange}
            {...props}
          />

          {/* Status Icon or Card Type Badge */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {isValid && !hasError && !disabled && (
              <Check size={18} className="text-green-600" aria-label="valid card number" />
            )}
            {hasError && !disabled && (
              <AlertCircle size={18} className="text-red-600" aria-label="invalid card number" />
            )}
            {cardType && !hasError && !isValid && (
              <span className="text-xs font-semibold text-gray-500 uppercase">
                {cardType}
              </span>
            )}
          </div>
        </div>

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

CardInput.displayName = 'CardInput';

// Card Expiry Input Component
export interface CardExpiryInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  optional?: boolean;
  isValid?: boolean;
  fullWidth?: boolean;
  onValueChange?: (value: string) => void;
}

export const CardExpiryInput = forwardRef<HTMLInputElement, CardExpiryInputProps>(
  (
    {
      label,
      error,
      helperText,
      required,
      optional,
      isValid,
      fullWidth = true,
      className = '',
      disabled,
      onValueChange,
      ...props
    },
    ref
  ) => {
    const hasError = Boolean(error);

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

        {/* Expiry Input Container */}
        <div className="relative">
          {/* Expiry Input Field */}
          <input
            ref={ref}
            type="text"
            inputMode="numeric"
            autoComplete="cc-exp"
            placeholder="MM/YY"
            maxLength={5}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={
              error ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined
            }
            className={`
              w-full px-3 py-2.5 
              border rounded-lg
              text-gray-900 placeholder-gray-400
              font-mono tracking-wide
              transition-all duration-200
              ${
                hasError
                  ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50'
                  : isValid
                  ? 'border-green-500 focus:border-green-500 focus:ring-2 focus:ring-green-200 bg-green-50'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
              }
              ${
                disabled
                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed opacity-60'
                  : 'bg-white hover:border-gray-400'
              }
              focus:outline-none
              ${className}
            `}
            {...props}
          />

          {/* Status Icon */}
          {(isValid || hasError) && !disabled && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {isValid && <Check size={18} className="text-green-600" aria-label="valid expiry" />}
              {hasError && <AlertCircle size={18} className="text-red-600" aria-label="invalid expiry" />}
            </div>
          )}
        </div>

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

CardExpiryInput.displayName = 'CardExpiryInput';

// CVV Input Component
export interface CVVInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  optional?: boolean;
  isValid?: boolean;
  fullWidth?: boolean;
}

export const CVVInput = forwardRef<HTMLInputElement, CVVInputProps>(
  (
    {
      label,
      error,
      helperText,
      required,
      optional,
      isValid,
      fullWidth = true,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const hasError = Boolean(error);

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

        {/* CVV Input Container */}
        <div className="relative">
          {/* CVV Input Field */}
          <input
            ref={ref}
            type="text"
            inputMode="numeric"
            autoComplete="cc-csc"
            placeholder="•••"
            maxLength={4}
            disabled={disabled}
            aria-invalid={hasError}
            aria-describedby={
              error ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined
            }
            className={`
              w-full px-3 py-2.5 
              border rounded-lg
              text-gray-900 placeholder-gray-400
              font-mono tracking-wide text-center
              transition-all duration-200
              ${
                hasError
                  ? 'border-red-500 focus:border-red-500 focus:ring-2 focus:ring-red-200 bg-red-50'
                  : isValid
                  ? 'border-green-500 focus:border-green-500 focus:ring-2 focus:ring-green-200 bg-green-50'
                  : 'border-gray-300 focus:border-blue-500 focus:ring-2 focus:ring-blue-200'
              }
              ${
                disabled
                  ? 'bg-gray-100 text-gray-500 cursor-not-allowed opacity-60'
                  : 'bg-white hover:border-gray-400'
              }
              focus:outline-none
              ${className}
            `}
            {...props}
          />

          {/* Status Icon */}
          {(isValid || hasError) && !disabled && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {isValid && <Check size={18} className="text-green-600" aria-label="valid CVV" />}
              {hasError && <AlertCircle size={18} className="text-red-600" aria-label="invalid CVV" />}
            </div>
          )}
        </div>

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

CVVInput.displayName = 'CVVInput';
