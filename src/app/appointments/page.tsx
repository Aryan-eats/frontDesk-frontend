'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingOverlay, LoadingSpinner } from '../../components/LoadingSpinner';
import ProtectedRoute from '../../components/ProtectedRoute';
import { apiService, Appointment, Doctor, CreateAppointmentRequest } from '../../services/api';
import { validateRequired, validateEmail } from '../../utils/validation';
import { 
  X, 
  Calendar, 
  Mail, 
  Phone, 
  Plus,
  Edit,
  Trash2,
  Clock
} from 'lucide-react';

export default function AppointmentsPage() {
  const { } = useAuth();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAppointment, setEditingAppointment] = useState<Appointment | null>(null);
  const [filterDate, setFilterDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [filterDoctor, setFilterDoctor] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // Form state
  const [formData, setFormData] = useState<CreateAppointmentRequest>({
    patientName: '',
    patientEmail: '',
    patientPhone: '',
    appointmentTime: '',
    doctorId: 0,
    notes: ''
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [appointmentsData, doctorsData] = await Promise.all([
        apiService.getAppointments(),
        apiService.getDoctors()
      ]);
      
      setAppointments(appointmentsData);
      setDoctors(doctorsData);
    } catch (err: unknown) {
      setError('Failed to load data. Please try again.');
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!validateRequired(formData.patientName)) {
      errors.patientName = 'Patient name is required';
    }
    
    if (!formData.doctorId || formData.doctorId === 0) {
      errors.doctorId = 'Please select a doctor';
    }
    
    if (!validateRequired(formData.appointmentTime)) {
      errors.appointmentTime = 'Appointment time is required';
    }
    
    if (formData.patientEmail && !validateEmail(formData.patientEmail)) {
      errors.patientEmail = 'Please enter a valid email address';
    }
    
    // Check if appointment time is in the future
    if (formData.appointmentTime) {
      const appointmentDate = new Date(formData.appointmentTime);
      const now = new Date();
      if (appointmentDate <= now) {
        errors.appointmentTime = 'Appointment time must be in the future';
      }
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
      
      if (editingAppointment) {
        const updatedAppointment = await apiService.updateAppointment(editingAppointment.id, formData);
        setAppointments(prev => prev.map(a => a.id === editingAppointment.id ? updatedAppointment : a));
        setEditingAppointment(null);
      } else {
        const newAppointment = await apiService.createAppointment(formData);
        setAppointments(prev => [...prev, newAppointment]);
      }
      
      resetForm();
      setShowAddForm(false);
    } catch (err: unknown) {
      setError(editingAppointment ? 'Failed to update appointment.' : 'Failed to create appointment.');
      console.error('Error saving appointment:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (appointment: Appointment) => {
    setFormData({
      patientName: appointment.patientName,
      patientEmail: appointment.patientEmail || '',
      patientPhone: appointment.patientPhone || '',
      appointmentTime: appointment.appointmentTime.slice(0, 16), // Format for datetime-local input
      doctorId: appointment.doctorId,
      notes: appointment.notes || ''
    });
    setEditingAppointment(appointment);
    setShowAddForm(true);
    setValidationErrors({});
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this appointment?')) return;
    
    try {
      await apiService.deleteAppointment(id);
      setAppointments(prev => prev.filter(a => a.id !== id));
    } catch (err: unknown) {
      setError('Failed to delete appointment.');
      console.error('Error deleting appointment:', err);
    }
  };

  const resetForm = () => {
    setFormData({
      patientName: '',
      patientEmail: '',
      patientPhone: '',
      appointmentTime: '',
      doctorId: 0,
      notes: ''
    });
    setValidationErrors({});
    setEditingAppointment(null);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'booked': return 'bg-blue-500';
      case 'in-progress': return 'bg-yellow-500';
      case 'completed': return 'bg-green-500';
      case 'canceled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredAppointments = appointments.filter(appointment => {
    const appointmentDate = new Date(appointment.appointmentTime).toISOString().split('T')[0];
    const matchesDate = !filterDate || appointmentDate === filterDate;
    const matchesDoctor = !filterDoctor || appointment.doctorId.toString() === filterDoctor;
    const matchesStatus = !filterStatus || appointment.status === filterStatus;
    
    return matchesDate && matchesDoctor && matchesStatus;
  });

  return (
    <ProtectedRoute>
      <LoadingOverlay isLoading={isLoading} message="Loading appointments...">
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
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">Appointment Management</h1>
                  <p className="text-gray-600">Schedule and manage patient appointments</p>
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
                      New Appointment
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
                    Date
                  </label>
                  <input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="w-full bg-white text-gray-900 px-3 py-2 rounded border border-gray-300 focus:ring-violet-500 focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Doctor
                  </label>
                  <select
                    value={filterDoctor}
                    onChange={(e) => setFilterDoctor(e.target.value)}
                    className="w-full bg-white text-gray-900 px-3 py-2 rounded border border-gray-300 focus:ring-violet-500 focus:border-violet-500"
                  >
                    <option value="">All Doctors</option>
                    {doctors.map(doctor => (
                      <option key={doctor.id} value={doctor.id.toString()}>
                        {doctor.name} - {doctor.specialization}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full bg-white text-gray-900 px-3 py-2 rounded border border-gray-300 focus:ring-violet-500 focus:border-violet-500"
                  >
                    <option value="">All</option>
                    <option value="booked">Booked</option>
                    <option value="in-progress">In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="canceled">Canceled</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Add/Edit Appointment Form */}
            {showAddForm && (
              <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  {editingAppointment ? 'Edit Appointment' : 'New Appointment'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Patient Name *
                      </label>
                      <input
                        type="text"
                        value={formData.patientName}
                        onChange={(e) => setFormData(prev => ({ ...prev, patientName: e.target.value }))}
                        className={`w-full bg-white text-gray-900 px-3 py-2 rounded border ${
                          validationErrors.patientName ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-violet-500 focus:border-violet-500'
                        }`}
                        placeholder="Enter patient name"
                        disabled={isSubmitting}
                      />
                      {validationErrors.patientName && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors.patientName}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Doctor *
                      </label>
                      <select
                        value={formData.doctorId}
                        onChange={(e) => setFormData(prev => ({ ...prev, doctorId: parseInt(e.target.value) }))}
                        className={`w-full bg-white text-gray-900 px-3 py-2 rounded border ${
                          validationErrors.doctorId ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-violet-500 focus:border-violet-500'
                        }`}
                        disabled={isSubmitting}
                      >
                        <option value={0}>Select a doctor</option>
                        {doctors.map(doctor => (
                          <option key={doctor.id} value={doctor.id}>
                            {doctor.name} - {doctor.specialization}
                          </option>
                        ))}
                      </select>
                      {validationErrors.doctorId && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors.doctorId}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Appointment Date & Time *
                      </label>
                      <input
                        type="datetime-local"
                        value={formData.appointmentTime}
                        onChange={(e) => setFormData(prev => ({ ...prev, appointmentTime: e.target.value }))}
                        className={`w-full bg-white text-gray-900 px-3 py-2 rounded border ${
                          validationErrors.appointmentTime ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-violet-500 focus:border-violet-500'
                        }`}
                        disabled={isSubmitting}
                        min={new Date().toISOString().slice(0, 16)}
                      />
                      {validationErrors.appointmentTime && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors.appointmentTime}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Patient Email
                      </label>
                      <input
                        type="email"
                        value={formData.patientEmail}
                        onChange={(e) => setFormData(prev => ({ ...prev, patientEmail: e.target.value }))}
                        className={`w-full bg-white text-gray-900 px-3 py-2 rounded border ${
                          validationErrors.patientEmail ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : 'border-gray-300 focus:ring-violet-500 focus:border-violet-500'
                        }`}
                        placeholder="Enter patient email"
                        disabled={isSubmitting}
                      />
                      {validationErrors.patientEmail && (
                        <p className="text-red-500 text-sm mt-1">{validationErrors.patientEmail}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Patient Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.patientPhone}
                        onChange={(e) => setFormData(prev => ({ ...prev, patientPhone: e.target.value }))}
                        className="w-full bg-white text-gray-900 px-3 py-2 rounded border border-gray-300 focus:ring-violet-500 focus:border-violet-500"
                        placeholder="Enter patient phone"
                        disabled={isSubmitting}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Notes
                      </label>
                      <textarea
                        value={formData.notes}
                        onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full bg-white text-gray-900 px-3 py-2 rounded border border-gray-300 focus:ring-violet-500 focus:border-violet-500"
                        placeholder="Enter appointment notes"
                        rows={3}
                        disabled={isSubmitting}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-violet-600 hover:bg-violet-700 disabled:bg-gray-400 text-white py-2 px-4 rounded flex items-center gap-2"
                    >
                      {isSubmitting && <LoadingSpinner size="sm" />}
                      <Calendar className="h-4 w-4" />
                      {editingAppointment ? 'Update Appointment' : 'Create Appointment'}
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

            {/* Appointments List */}
            <div className="bg-white border border-gray-200 p-6 rounded-lg shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Appointments ({filteredAppointments.length})
              </h2>
              {filteredAppointments.length === 0 ? (
                <div className="text-center text-gray-500 py-8">
                  No appointments found
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAppointments
                    .sort((a, b) => new Date(a.appointmentTime).getTime() - new Date(b.appointmentTime).getTime())
                    .map((appointment) => (
                      <div key={appointment.id} className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <div className="font-semibold text-gray-900 text-lg">{appointment.patientName}</div>
                                <div className="text-sm text-gray-600 flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  {formatDateTime(appointment.appointmentTime)}
                                </div>
                                {appointment.patientEmail && (
                                  <div className="text-sm text-gray-600 flex items-center gap-1">
                                    <Mail className="h-4 w-4" />
                                    {appointment.patientEmail}
                                  </div>
                                )}
                                {appointment.patientPhone && (
                                  <div className="text-sm text-gray-600 flex items-center gap-1">
                                    <Phone className="h-4 w-4" />
                                    {appointment.patientPhone}
                                  </div>
                                )}
                              </div>
                              <div>
                                <div className="font-medium text-gray-900">{appointment.doctor.name}</div>
                                <div className="text-sm text-violet-600 font-medium">{appointment.doctor.specialization}</div>
                                <div className="text-sm text-gray-600">{appointment.doctor.location}</div>
                              </div>
                              <div>
                                {appointment.notes && (
                                  <div className="text-sm text-gray-600">
                                    <span className="font-medium">Notes:</span> {appointment.notes}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 ml-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(appointment.status)}`}>
                              {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1).replace('-', ' ')}
                            </span>
                            <button
                              onClick={() => handleEdit(appointment)}
                              className="bg-violet-600 hover:bg-violet-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                            >
                              <Edit className="h-3 w-3" />
                              Edit
                            </button>
                            <button
                              onClick={() => handleDelete(appointment.id)}
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
