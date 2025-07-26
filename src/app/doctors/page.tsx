'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingOverlay, LoadingSpinner } from '../../components/LoadingSpinner';
import ProtectedRoute from '../../components/ProtectedRoute';
import { apiService, Doctor, CreateDoctorRequest } from '../../services/api';
import { validateRequired, validateEmail } from '../../utils/validation';
import { 
  X, 
  Mail, 
  Phone, 
  Plus,
  Edit,
  Trash2,
  UserCheck
} from 'lucide-react';

export default function DoctorsPage() {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [filteredDoctors, setFilteredDoctors] = useState<Doctor[]>([]);
  const [filter, setFilter] = useState({ 
    specialization: '', 
    location: '', 
    status: ''
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState<Doctor | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateDoctorRequest>({
    name: '',
    specialization: '',
    gender: '',
    location: '',
    email: '',
    phone: '',
    availability: ''
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadDoctors();
  }, []);

  useEffect(() => {
    filterDoctors();
  }, [filter, doctors]);

  const loadDoctors = async () => {
    try {
      setIsLoading(true);
      setError(null);
      const data = await apiService.getDoctors();
      setDoctors(data);
    } catch (err: any) {
      setError('Failed to load doctors. Please try again.');
      console.error('Error loading doctors:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filterDoctors = () => {
    let filtered = doctors;
    
    if (filter.specialization) {
      filtered = filtered.filter(d => 
        d.specialization.toLowerCase().includes(filter.specialization.toLowerCase())
      );
    }
    
    if (filter.location) {
      filtered = filtered.filter(d => 
        d.location.toLowerCase().includes(filter.location.toLowerCase())
      );
    }
    
    if (filter.status) {
      filtered = filtered.filter(d => d.status === filter.status);
    }
    
    setFilteredDoctors(filtered);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!validateRequired(formData.name)) {
      errors.name = 'Doctor name is required';
    }
    
    if (!validateRequired(formData.specialization)) {
      errors.specialization = 'Specialization is required';
    }
    
    if (!validateRequired(formData.gender)) {
      errors.gender = 'Gender is required';
    }
    
    if (!validateRequired(formData.location)) {
      errors.location = 'Location is required';
    }
    
    if (formData.email && !validateEmail(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      if (editingDoctor) {
        const updatedDoctor = await apiService.updateDoctor(editingDoctor.id, formData);
        setDoctors(prev => prev.map(d => d.id === editingDoctor.id ? updatedDoctor : d));
        setEditingDoctor(null);
      } else {
        const newDoctor = await apiService.createDoctor(formData);
        setDoctors(prev => [...prev, newDoctor]);
      }
      
      resetForm();
      setShowAddForm(false);
    } catch (err: any) {
      setError(editingDoctor ? 'Failed to update doctor.' : 'Failed to add doctor.');
      console.error('Error saving doctor:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (doctor: Doctor) => {
    setFormData({
      name: doctor.name,
      specialization: doctor.specialization,
      gender: doctor.gender,
      location: doctor.location,
      email: doctor.email || '',
      phone: doctor.phone || '',
      availability: doctor.availability || ''
    });
    setEditingDoctor(doctor);
    setShowAddForm(true);
    setValidationErrors({});
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this doctor?')) return;
    
    try {
      await apiService.deleteDoctor(id);
      setDoctors(prev => prev.filter(d => d.id !== id));
    } catch (err: any) {
      setError('Failed to delete doctor.');
      console.error('Error deleting doctor:', err);
    }
  };

  const updateDoctorStatus = async (id: number, status: 'available' | 'busy' | 'off-duty') => {
    try {
      const updatedDoctor = await apiService.updateDoctorStatus(id, status);
      setDoctors(prev => prev.map(d => d.id === id ? updatedDoctor : d));
    } catch (err: any) {
      setError('Failed to update doctor status.');
      console.error('Error updating doctor status:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      specialization: '',
      gender: '',
      location: '',
      email: '',
      phone: '',
      availability: ''
    });
    setValidationErrors({});
    setEditingDoctor(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return 'bg-green-500';
      case 'busy': return 'bg-yellow-500';
      case 'off-duty': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const specializations = [
    'General Practice', 'Cardiology', 'Dermatology', 'Pediatrics', 
    'Orthopedics', 'Neurology', 'Psychiatry', 'Radiology'
  ];

  return (
    <ProtectedRoute>
      <LoadingOverlay isLoading={isLoading} message="Loading doctors...">
        <div className="min-h-screen bg-white text-gray-900 p-6">
          <div className="max-w-7xl mx-auto space-y-6">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span>{error}</span>
                  <button 
                    onClick={() => setError(null)}
                    className="text-red-500 hover:text-red-700"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Header */}
            <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
              <div className="flex justify-between items-center">
                <div>
                  <h1 className="text-2xl font-bold text-violet-500 mb-2">Doctor Management</h1>
                  <p className="text-gray-600">Manage doctor profiles and availability</p>
                </div>
                <button
                  onClick={() => {
                    resetForm();
                    setShowAddForm(!showAddForm);
                  }}
                  className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded flex items-center gap-2"
                >
                  {showAddForm ? (
                    <>
                      <X className="h-4 w-4" />
                      Cancel
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4" />
                      Add Doctor
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Filters */}
            <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Filters</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Specialization
                  </label>
                  <input
                    type="text"
                    value={filter.specialization}
                    onChange={(e) => setFilter(prev => ({ ...prev, specialization: e.target.value }))}
                    className="w-full bg-white text-gray-900 px-3 py-2 rounded border border-gray-300 focus:ring-violet-500 focus:border-violet-500"
                    placeholder="Filter by specialization"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={filter.location}
                    onChange={(e) => setFilter(prev => ({ ...prev, location: e.target.value }))}
                    className="w-full bg-white text-gray-900 px-3 py-2 rounded border border-gray-300 focus:ring-violet-500 focus:border-violet-500"
                    placeholder="Filter by location"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={filter.status}
                    onChange={(e) => setFilter(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full bg-white text-gray-900 px-3 py-2 rounded border border-gray-300 focus:ring-violet-500 focus:border-violet-500"
                  >
                    <option value="">All</option>
                    <option value="available">Available</option>
                    <option value="busy">Busy</option>
                    <option value="off-duty">Off Duty</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Add/Edit Doctor Form */}
            {showAddForm && (
              <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {editingDoctor ? 'Edit Doctor' : 'Add New Doctor'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className={`w-full bg-white text-gray-900 px-3 py-2 rounded border ${
                          validationErrors.name ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-violet-500 focus:border-violet-500'
                        }`}
                        placeholder="Enter doctor's full name"
                        disabled={isSubmitting}
                      />
                      {validationErrors.name && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors.name}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Specialization *
                      </label>
                      <select
                        value={formData.specialization}
                        onChange={(e) => setFormData(prev => ({ ...prev, specialization: e.target.value }))}
                        className={`w-full bg-white text-gray-900 px-3 py-2 rounded border ${
                          validationErrors.specialization ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-violet-500 focus:border-violet-500'
                        }`}
                        disabled={isSubmitting}
                      >
                        <option value="">Select specialization</option>
                        {specializations.map(spec => (
                          <option key={spec} value={spec}>{spec}</option>
                        ))}
                      </select>
                      {validationErrors.specialization && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors.specialization}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Gender *
                      </label>
                      <select
                        value={formData.gender}
                        onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                        className={`w-full bg-white text-gray-900 px-3 py-2 rounded border ${
                          validationErrors.gender ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-violet-500 focus:border-violet-500'
                        }`}
                        disabled={isSubmitting}
                      >
                        <option value="">Select gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                      {validationErrors.gender && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors.gender}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Location *
                      </label>
                      <input
                        type="text"
                        value={formData.location}
                        onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                        className={`w-full bg-white text-gray-900 px-3 py-2 rounded border ${
                          validationErrors.location ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-violet-500 focus:border-violet-500'
                        }`}
                        placeholder="Enter clinic/hospital location"
                        disabled={isSubmitting}
                      />
                      {validationErrors.location && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors.location}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className={`w-full bg-white text-gray-900 px-3 py-2 rounded border ${
                          validationErrors.email ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-violet-500 focus:border-violet-500'
                        }`}
                        placeholder="Enter email address"
                        disabled={isSubmitting}
                      />
                      {validationErrors.email && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors.email}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        className="w-full bg-white text-gray-900 px-3 py-2 rounded border border-gray-300 focus:ring-violet-500 focus:border-violet-500"
                        placeholder="Enter phone number"
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Availability
                    </label>
                    <input
                      type="text"
                      value={formData.availability}
                      onChange={(e) => setFormData(prev => ({ ...prev, availability: e.target.value }))}
                      className="w-full bg-white text-gray-900 px-3 py-2 rounded border border-gray-300 focus:ring-violet-500 focus:border-violet-500"
                      placeholder="e.g., Mon-Fri 9AM-5PM"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-violet-600 hover:bg-violet-700 disabled:bg-gray-400 text-white py-2 px-4 rounded flex items-center gap-2"
                    >
                      {isSubmitting && <LoadingSpinner size="sm" />}
                      <Plus className="h-4 w-4" />
                      {editingDoctor ? 'Update Doctor' : 'Add Doctor'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        resetForm();
                        setShowAddForm(false);
                      }}
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 py-2 px-4 rounded border border-gray-300"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Doctors List */}
            <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Doctors ({filteredDoctors.length})
              </h2>
              {filteredDoctors.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No doctors found
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredDoctors.map((doctor) => (
                    <div key={doctor.id} className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-violet-100 text-violet-600 rounded-full flex items-center justify-center">
                            <span className="font-bold text-lg">
                              {doctor.name.split(' ').map(n => n[0]).join('').substring(0, 2)}
                            </span>
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900 text-lg">{doctor.name}</div>
                            <div className="text-violet-600 font-medium">{doctor.specialization}</div>
                            <div className="text-sm text-gray-600">
                              {doctor.location} • {doctor.gender}
                            </div>
                            {doctor.email && (
                              <div className="text-sm text-gray-600 flex items-center gap-1">
                                <Mail className="h-4 w-4" />
                                {doctor.email}
                              </div>
                            )}
                            {doctor.phone && (
                              <div className="text-sm text-gray-600 flex items-center gap-1">
                                <Phone className="h-4 w-4" />
                                {doctor.phone}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <select
                            value={doctor.status}
                            onChange={(e) => updateDoctorStatus(doctor.id, e.target.value as any)}
                            className="bg-white text-gray-900 px-2 py-1 rounded text-sm border border-gray-300 focus:ring-violet-500 focus:border-violet-500"
                          >
                            <option value="available">Available</option>
                            <option value="busy">Busy</option>
                            <option value="off-duty">Off Duty</option>
                          </select>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(doctor.status)}`}>
                            {doctor.status.charAt(0).toUpperCase() + doctor.status.slice(1).replace('-', ' ')}
                          </span>
                          <button
                            onClick={() => handleEdit(doctor)}
                            className="bg-violet-600 hover:bg-violet-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                          >
                            <Edit className="h-3 w-3" />
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(doctor.id)}
                            className="bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                          >
                            <Trash2 className="h-3 w-3" />
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </LoadingOverlay>
    </ProtectedRoute>
  );
}
