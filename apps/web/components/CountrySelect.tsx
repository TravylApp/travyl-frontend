import { forwardRef, InputHTMLAttributes, useState, useMemo } from 'react';
import { AlertCircle, Globe, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { ScrollArea } from './ui/scroll-area';

export interface CountrySelectProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
  optional?: boolean;
  isValid?: boolean;
  fullWidth?: boolean;
  onCountrySelect?: (country: string) => void;
}

const countries = [
  'Afghanistan', 'Albania', 'Algeria', 'Andorra', 'Angola', 'Antigua and Barbuda', 'Argentina', 'Armenia', 'Australia', 'Austria',
  'Azerbaijan', 'Bahamas', 'Bahrain', 'Bangladesh', 'Barbados', 'Belarus', 'Belgium', 'Belize', 'Benin', 'Bhutan',
  'Bolivia', 'Bosnia and Herzegovina', 'Botswana', 'Brazil', 'Brunei', 'Bulgaria', 'Burkina Faso', 'Burundi', 'Cambodia', 'Cameroon',
  'Canada', 'Cape Verde', 'Central African Republic', 'Chad', 'Chile', 'China', 'Colombia', 'Comoros', 'Congo', 'Costa Rica',
  'Croatia', 'Cuba', 'Cyprus', 'Czech Republic', 'Denmark', 'Djibouti', 'Dominica', 'Dominican Republic', 'East Timor', 'Ecuador',
  'Egypt', 'El Salvador', 'Equatorial Guinea', 'Eritrea', 'Estonia', 'Ethiopia', 'Fiji', 'Finland', 'France', 'Gabon',
  'Gambia', 'Georgia', 'Germany', 'Ghana', 'Greece', 'Grenada', 'Guatemala', 'Guinea', 'Guinea-Bissau', 'Guyana',
  'Haiti', 'Honduras', 'Hungary', 'Iceland', 'India', 'Indonesia', 'Iran', 'Iraq', 'Ireland', 'Israel',
  'Italy', 'Ivory Coast', 'Jamaica', 'Japan', 'Jordan', 'Kazakhstan', 'Kenya', 'Kiribati', 'Kosovo', 'Kuwait',
  'Kyrgyzstan', 'Laos', 'Latvia', 'Lebanon', 'Lesotho', 'Liberia', 'Libya', 'Liechtenstein', 'Lithuania', 'Luxembourg',
  'Macedonia', 'Madagascar', 'Malawi', 'Malaysia', 'Maldives', 'Mali', 'Malta', 'Marshall Islands', 'Mauritania', 'Mauritius',
  'Mexico', 'Micronesia', 'Moldova', 'Monaco', 'Mongolia', 'Montenegro', 'Morocco', 'Mozambique', 'Myanmar', 'Namibia',
  'Nauru', 'Nepal', 'Netherlands', 'New Zealand', 'Nicaragua', 'Niger', 'Nigeria', 'North Korea', 'Norway', 'Oman',
  'Pakistan', 'Palau', 'Palestine', 'Panama', 'Papua New Guinea', 'Paraguay', 'Peru', 'Philippines', 'Poland', 'Portugal',
  'Qatar', 'Romania', 'Russia', 'Rwanda', 'Saint Kitts and Nevis', 'Saint Lucia', 'Saint Vincent and the Grenadines', 'Samoa', 'San Marino', 'Sao Tome and Principe',
  'Saudi Arabia', 'Senegal', 'Serbia', 'Seychelles', 'Sierra Leone', 'Singapore', 'Slovakia', 'Slovenia', 'Solomon Islands', 'Somalia',
  'South Africa', 'South Korea', 'South Sudan', 'Spain', 'Sri Lanka', 'Sudan', 'Suriname', 'Swaziland', 'Sweden', 'Switzerland',
  'Syria', 'Taiwan', 'Tajikistan', 'Tanzania', 'Thailand', 'Togo', 'Tonga', 'Trinidad and Tobago', 'Tunisia', 'Turkey',
  'Turkmenistan', 'Tuvalu', 'Uganda', 'Ukraine', 'United Arab Emirates', 'United Kingdom', 'United States', 'Uruguay', 'Uzbekistan', 'Vanuatu',
  'Vatican City', 'Venezuela', 'Vietnam', 'Yemen', 'Zambia', 'Zimbabwe'
];

export const CountrySelect = forwardRef<HTMLInputElement, CountrySelectProps>(
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
      value,
      onChange,
      onCountrySelect,
      ...props
    },
    ref
  ) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    const filteredCountries = useMemo(() => {
      if (!searchQuery) return countries;
      return countries.filter(country =>
        country.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }, [searchQuery]);

    const handleCountrySelect = (country: string) => {
      if (onChange) {
        const syntheticEvent = {
          target: { 
            value: country,
            name: props.name,
            id: props.id,
          },
          currentTarget: { 
            value: country,
            name: props.name,
            id: props.id,
          },
          preventDefault: () => {},
          stopPropagation: () => {},
        } as React.ChangeEvent<HTMLInputElement>;
        
        onChange(syntheticEvent);
      }
      
      if (onCountrySelect) {
        onCountrySelect(country);
      }
      
      setSearchQuery('');
      setIsOpen(false);
    };

    const handleIconClick = () => {
      if (!disabled) {
        setIsOpen(!isOpen);
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

        {/* Country Select Container */}
        <div className="relative">
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                onClick={handleIconClick}
                disabled={disabled}
                className={`absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 transition-colors z-10 bg-white rounded p-0.5 ${
                  disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer hover:text-gray-600'
                }`}
                aria-label="Open country picker"
              >
                <Globe size={18} />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
              <div className="flex flex-col">
                {/* Search Input */}
                <div className="p-3 border-b">
                  <input
                    type="text"
                    placeholder="Search countries..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    autoFocus
                  />
                </div>
                
                {/* Country List */}
                <ScrollArea className="h-[300px]">
                  <div className="p-2">
                    {filteredCountries.length === 0 ? (
                      <div className="px-3 py-8 text-center text-sm text-gray-500">
                        No countries found
                      </div>
                    ) : (
                      filteredCountries.map((country) => (
                        <button
                          key={country}
                          type="button"
                          onClick={() => handleCountrySelect(country)}
                          className={`w-full text-left px-3 py-2 text-sm rounded-md hover:bg-gray-100 transition-colors flex items-center justify-between ${
                            value === country ? 'bg-blue-50 text-blue-600' : 'text-gray-700'
                          }`}
                        >
                          <span>{country}</span>
                          {value === country && <Check size={16} />}
                        </button>
                      ))
                    )}
                  </div>
                </ScrollArea>
              </div>
            </PopoverContent>
          </Popover>

          {/* Input Field */}
          <input
            ref={ref}
            type="text"
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

CountrySelect.displayName = 'CountrySelect';