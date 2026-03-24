// Validation utility functions

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

// Email validation
export const validateEmail = (email: string): ValidationResult => {
  if (!email || email.trim() === '') {
    return { isValid: false, error: 'Email is required' };
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { isValid: false, error: 'Please enter a valid email address' };
  }
  
  return { isValid: true };
};

// Passport number validation (alphanumeric, 6-9 characters)
export const validatePassportNumber = (passport: string): ValidationResult => {
  if (!passport || passport.trim() === '') {
    return { isValid: false, error: 'Passport number is required' };
  }
  
  const passportRegex = /^[A-Z0-9]{6,9}$/i;
  if (!passportRegex.test(passport.replace(/\s/g, ''))) {
    return { isValid: false, error: 'Invalid passport format (6-9 alphanumeric characters)' };
  }
  
  return { isValid: true };
};

// Date validation - must be in the future
export const validateFutureDate = (date: string, fieldName: string = 'Date'): ValidationResult => {
  if (!date || date.trim() === '') {
    return { isValid: false, error: `${fieldName} is required` };
  }
  
  const selectedDate = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (selectedDate <= today) {
    return { isValid: false, error: `${fieldName} must be in the future` };
  }
  
  return { isValid: true };
};

// Credit card number validation (Luhn algorithm)
export const validateCardNumber = (cardNumber: string): ValidationResult => {
  if (!cardNumber || cardNumber.trim() === '') {
    return { isValid: false, error: 'Card number is required' };
  }
  
  // Remove spaces and dashes
  const cleaned = cardNumber.replace(/[\s-]/g, '');
  
  // Check if it's all digits and 13-19 characters
  if (!/^\d{13,19}$/.test(cleaned)) {
    return { isValid: false, error: 'Invalid card number format' };
  }
  
  // Luhn algorithm
  let sum = 0;
  let isEven = false;
  
  for (let i = cleaned.length - 1; i >= 0; i--) {
    let digit = parseInt(cleaned[i], 10);
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  if (sum % 10 !== 0) {
    return { isValid: false, error: 'Invalid card number' };
  }
  
  return { isValid: true };
};

// Card expiry validation (MM/YY format, must be in future)
export const validateCardExpiry = (expiry: string): ValidationResult => {
  if (!expiry || expiry.trim() === '') {
    return { isValid: false, error: 'Expiry date is required' };
  }
  
  const expiryRegex = /^(0[1-9]|1[0-2])\/([0-9]{2})$/;
  if (!expiryRegex.test(expiry)) {
    return { isValid: false, error: 'Invalid format (MM/YY)' };
  }
  
  const [month, year] = expiry.split('/');
  const expiryDate = new Date(2000 + parseInt(year), parseInt(month) - 1);
  const today = new Date();
  
  if (expiryDate < today) {
    return { isValid: false, error: 'Card has expired' };
  }
  
  return { isValid: true };
};

// CVV validation (3-4 digits)
export const validateCVV = (cvv: string): ValidationResult => {
  if (!cvv || cvv.trim() === '') {
    return { isValid: false, error: 'CVV is required' };
  }
  
  if (!/^\d{3,4}$/.test(cvv)) {
    return { isValid: false, error: 'CVV must be 3-4 digits' };
  }
  
  return { isValid: true };
};

// Required field validation
export const validateRequired = (value: string, fieldName: string): ValidationResult => {
  if (!value || value.trim() === '') {
    return { isValid: false, error: `${fieldName} is required` };
  }
  
  return { isValid: true };
};

// Name validation (letters, spaces, hyphens only)
export const validateName = (name: string, fieldName: string): ValidationResult => {
  if (!name || name.trim() === '') {
    return { isValid: false, error: `${fieldName} is required` };
  }
  
  const nameRegex = /^[a-zA-Z\s-']+$/;
  if (!nameRegex.test(name)) {
    return { isValid: false, error: `${fieldName} can only contain letters, spaces, and hyphens` };
  }
  
  if (name.length < 2) {
    return { isValid: false, error: `${fieldName} must be at least 2 characters` };
  }
  
  return { isValid: true };
};

// Date of birth validation (must be in past, at least 18 years old)
export const validateDateOfBirth = (dob: string): ValidationResult => {
  if (!dob || dob.trim() === '') {
    return { isValid: false, error: 'Date of birth is required' };
  }
  
  const birthDate = new Date(dob);
  const today = new Date();
  
  if (birthDate >= today) {
    return { isValid: false, error: 'Date of birth must be in the past' };
  }
  
  // Calculate age
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  if (age < 18) {
    return { isValid: false, error: 'You must be at least 18 years old' };
  }
  
  if (age > 120) {
    return { isValid: false, error: 'Please enter a valid date of birth' };
  }
  
  return { isValid: true };
};

// Format card number with spaces
export const formatCardNumber = (value: string): string => {
  const cleaned = value.replace(/\s/g, '');
  const chunks = cleaned.match(/.{1,4}/g) || [];
  return chunks.join(' ');
};

// Format card expiry as MM/YY
export const formatCardExpiry = (value: string): string => {
  const cleaned = value.replace(/\D/g, '');
  if (cleaned.length >= 2) {
    return cleaned.slice(0, 2) + '/' + cleaned.slice(2, 4);
  }
  return cleaned;
};
