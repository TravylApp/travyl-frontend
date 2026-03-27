import { forwardRef, InputHTMLAttributes, useRef, useState } from 'react';
import { AlertCircle, Calendar as CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Calendar } from './ui/calendar';

export interface DateInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  optional?: boolean;
  isValid?: boolean;
  fullWidth?: boolean;
  onIconClick?: () => void;
}

export const DateInput = forwardRef<HTMLInputElement, DateInputProps>(
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
      onIconClick,
      value,
      onChange,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const internalRef = useRef<HTMLInputElement>(null);
    const inputRef = (ref as any) || internalRef;

    const parseDate = (dateString: string | number | readonly string[] | undefined): Date | undefined => {
      if (!dateString || typeof dateString !== 'string') return undefined;
      try {
        const date = new Date(dateString);
        return isNaN(date.getTime()) ? undefined : date;
      } catch {
        return undefined;
      }
    };

    const selectedDate = parseDate(value as string);

    const handleDateSelect = (date: Date | undefined) => {
      if (date && onChange) {
        const formattedDate = format(date, 'yyyy-MM-dd');

        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
          window.HTMLInputElement.prototype,
          'value'
        )?.set;

        if (inputRef.current && nativeInputValueSetter) {
          nativeInputValueSetter.call(inputRef.current, formattedDate);
          inputRef.current.dispatchEvent(new Event('input', { bubbles: true }));
          inputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
        }

        const syntheticEvent = {
          target: { value: formattedDate, name: props.name, id: props.id },
          currentTarget: { value: formattedDate, name: props.name, id: props.id },
          preventDefault: () => {},
          stopPropagation: () => {},
        } as React.ChangeEvent<HTMLInputElement>;

        onChange(syntheticEvent);
      }
      setIsOpen(false);
    };

    const handleIconClick = () => {
      if (disabled) return;
      if (onIconClick) {
        onIconClick();
      } else {
        setIsOpen((prev) => !prev);
      }
    };

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

        {/* Date Input Container */}
        <div className="relative">
          {/* Invisible span anchors the popover position without Radix interfering with button styles */}
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <span className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 pointer-events-none" />
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={handleDateSelect}
                initialFocus
              />
            </PopoverContent>
          </Popover>

          {/* Visible calendar icon button — independent from Radix, no style interference */}
          <button
            type="button"
            onClick={handleIconClick}
            disabled={disabled}
            className={`absolute left-3 top-1/2 -translate-y-1/2 z-10 rounded p-0.5
              text-gray-500 bg-transparent transition-colors
              ${disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:text-blue-500'}
            `}
            aria-label="Open date picker"
          >
            <CalendarIcon size={18} />
          </button>

          {/* Date Input Field */}
          <input
            ref={inputRef}
            type="date"
            disabled={disabled}
            value={value}
            onChange={onChange}
            aria-invalid={hasError}
            aria-describedby={
              error ? `${props.id}-error` : helperText ? `${props.id}-helper` : undefined
            }
            className={`
              w-full pl-10 pr-3 py-2.5
              border rounded-lg
              text-gray-900
              transition-all duration-200
              [&::-webkit-calendar-picker-indicator]:hidden
              [&::-webkit-inner-spin-button]:hidden
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

DateInput.displayName = 'DateInput';