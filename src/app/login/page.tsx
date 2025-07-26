'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../contexts/AuthContext';
import { FormField } from '../../components/FormComponents';
import { LoadingSpinner } from '../../components/LoadingSpinner';
import { validateField, patterns } from '../../utils/validation';

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [message, setMessage] = useState('');
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    fullName: ''
  });
  const [errors, setErrors] = useState<{[key: string]: string}>({});
  
  const router = useRouter();
  const { login, signup, isLoading, error, clearError, isAuthenticated } = useAuth();

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, router]);

  // Handle form switch
  const handleFormModeChange = (newMode: boolean) => {
    setIsSignUp(newMode);
    clearError();
    setMessage('');
    setFormData({ username: '', password: '', email: '', fullName: '' });
    setErrors({});
  };

  const handleInputChange = (name: string, value: string | number) => {
    setFormData(prev => ({ ...prev, [name]: String(value) }));
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors: {[key: string]: string} = {};

    // Username validation
    const usernameError = validateField(formData.username, {
      required: true,
      minLength: 3,
      pattern: patterns.username
    });
    if (usernameError) newErrors.username = usernameError;

    // Password validation
    const passwordError = validateField(formData.password, {
      required: true,
      minLength: 6
    });
    if (passwordError) newErrors.password = passwordError;

    if (isSignUp) {
      // Email validation for signup
      const emailError = validateField(formData.email, {
        required: true,
        pattern: patterns.email
      });
      if (emailError) newErrors.email = emailError;

      // Full name validation for signup
      const nameError = validateField(formData.fullName, {
        required: true,
        minLength: 2,
        pattern: patterns.name
      });
      if (nameError) newErrors.fullName = nameError;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    clearError();

    if (!validateForm()) return;

    try {
      if (isSignUp) {
        await signup({
          username: formData.username,
          password: formData.password,
          email: formData.email,
          fullName: formData.fullName,
          role: 'staff'
        });
        
        setMessage('Account created successfully! Redirecting...');
        setTimeout(() => router.push('/'), 1500);
      } else {
        await login({
          username: formData.username,
          password: formData.password
        });
        
        router.push('/');
      }
    } catch (err: unknown) {
      // Error is handled by the auth context
      console.error('Authentication error:', err);
    }
  };

  const toggleMode = () => {
    handleFormModeChange(!isSignUp);
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="bg-white border border-gray-200 p-8 rounded-lg shadow-xl w-full max-w-md">
        <h1 className="text-3xl font-bold mb-6 text-gray-900 text-center">
          {isSignUp ? 'Create Account' : 'Front Desk Login'}
        </h1>
        
        {(message || error) && (
          <div className={`mb-4 p-3 rounded ${
            error 
              ? 'bg-red-900 border border-red-600 text-red-200' 
              : 'bg-green-900 border border-green-600 text-green-200'
          }`}>
            {error || message}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isSignUp && (
            <>
              <FormField
                label="Full Name"
                name="fullName"
                value={formData.fullName}
                onChange={handleInputChange}
                error={errors.fullName}
                placeholder="Enter your full name"
                required
              />
              
              <FormField
                label="Email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                error={errors.email}
                placeholder="Enter your email"
                required
              />
            </>
          )}
          
          <FormField
            label="Username"
            name="username"
            value={formData.username}
            onChange={handleInputChange}
            error={errors.username}
            placeholder="Enter your username"
            required
          />
          
          <FormField
            label="Password"
            name="password"
            type="password"
            value={formData.password}
            onChange={handleInputChange}
            error={errors.password}
            placeholder="Enter your password"
            required
          />

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-violet-500 hover:bg-violet-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-lg transition-colors flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <LoadingSpinner size="sm" color="white" className="mr-2" />
                {isSignUp ? 'Creating Account...' : 'Signing In...'}
              </>
            ) : (
              isSignUp ? 'Create Account' : 'Sign In'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={toggleMode}
            className="text-gray-900 hover:text-gray-700 text-sm"
          >
            {isSignUp 
              ? 'Already have an account? Sign in' 
              : "Don't have an account? Create one"
            }
          </button>
        </div>
      </div>
    </div>
  );
}
