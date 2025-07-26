export interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  customValidator?: (value: unknown) => string | null;
}

export interface FieldValidation {
  [fieldName: string]: ValidationRule;
}

export interface ValidationErrors {
  [fieldName: string]: string;
}

export const validateRequired = (value: string): boolean => {
  return value != null && value.trim().length > 0;
};

export const validateEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validateField = (value: unknown, rules: ValidationRule): string | null => {
  if (rules.required && (!value || (typeof value === 'string' && value.trim() === ''))) {
    return 'Required field';
  }

  if (!value || (typeof value === 'string' && value.trim() === '')) {
    return null;
  }

  if (typeof value === 'string') {
    if (rules.minLength && value.length < rules.minLength) {
      return `Minimum ${rules.minLength} characters required`;
    }

    if (rules.maxLength && value.length > rules.maxLength) {
      return `Maximum ${rules.maxLength} characters allowed`;
    }

    if (rules.pattern && !rules.pattern.test(value)) {
      return 'Invalid format';
    }
  }

  if (rules.customValidator) {
    return rules.customValidator(value);
  }

  return null;
};

export const validateForm = (data: Record<string, unknown>, validation: FieldValidation): ValidationErrors => {
  const errors: ValidationErrors = {};

  Object.keys(validation).forEach(fieldName => {
    const fieldValue = data[fieldName];
    const fieldRules = validation[fieldName];
    const error = validateField(fieldValue, fieldRules);
    
    if (error) {
      errors[fieldName] = error;
    }
  });

  return errors;
};

export const hasValidationErrors = (errors: ValidationErrors): boolean => {
  return Object.keys(errors).length > 0;
};

export const patterns = {
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  phone: /^[\+]?[1-9][\d]{0,15}$/,
  name: /^[a-zA-Z\s'-]{2,}$/,
  username: /^[a-zA-Z0-9_]{3,}$/,
};
