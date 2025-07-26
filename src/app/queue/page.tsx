'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingOverlay, LoadingSpinner } from '../../components/LoadingSpinner';
import ProtectedRoute from '../../components/ProtectedRoute';
import { apiService, QueueItem, Doctor } from '../../services/api';
import { validateRequired } from '../../utils/validation';
import { 
  Users, 
  AlertTriangle, 
  Clock, 
  Phone, 
  UserCheck, 
  X 
} from 'lucide-react';

export default function QueuePage() {
  const { user } = useAuth();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [queueData, doctorsData] = await Promise.all([
        apiService.getQueue(),
        apiService.getDoctors()
      ]);
      
      setQueue(queueData);
      setDoctors(doctorsData);
    } catch (err: any) {
      setError('Failed to load data. Please try again.');
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!validateRequired(patientName)) {
      errors.patientName = 'Patient name is required';
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleAddToQueue = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    try {
      setIsSubmitting(true);
      setError(null);
      
      const newQueueItem = await apiService.addToQueue({
        patientName: patientName.trim(),
        patientPhone: patientPhone.trim() || undefined,
        doctorId: selectedDoctorId ? parseInt(selectedDoctorId) : undefined,
        priority
      });
      
      setQueue(prev => [...prev, newQueueItem]);
      setPatientName('');
      setPatientPhone('');
      setSelectedDoctorId('');
      setPriority('normal');
      setValidationErrors({});
    } catch (err: any) {
      setError('Failed to add patient to queue.');
      console.error('Error adding patient:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateQueueStatus = async (id: number, status: 'waiting' | 'with-doctor' | 'completed' | 'canceled') => {
    try {
      const updatedItem = await apiService.updateQueueItem(id, { status } as any);
      setQueue(prev => prev.map(item => item.id === id ? updatedItem : item));
    } catch (err: any) {
      setError('Failed to update queue status.');
      console.error('Error updating queue status:', err);
    }
  };

  const removeFromQueue = async (id: number) => {
    try {
      await apiService.removeFromQueue(id);
      setQueue(prev => prev.filter(item => item.id !== id));
    } catch (err: any) {
      setError('Failed to remove patient from queue.');
      console.error('Error removing patient:', err);
    }
  };

  const callNextPatient = async () => {
    try {
      const nextPatient = await apiService.callNextPatient();
      if (nextPatient) {
        setQueue(prev => prev.map(item => 
          item.id === nextPatient.id ? nextPatient : item
        ));
      }
    } catch (err: any) {
      setError('Failed to call next patient.');
      console.error('Error calling next patient:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-500';
      case 'with-doctor': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'canceled': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <ProtectedRoute>
      <LoadingOverlay isLoading={isLoading} message="Loading queue...">
        <div className="min-h-screen bg-white text-gray-900 p-6">
          <div className="max-w-6xl mx-auto space-y-6">
            {error && (
              <div className="bg-red-900 border border-red-600 text-red-200 p-4 rounded-lg">
                <div className="flex justify-between items-center">
                  <span>{error}</span>
                  <button 
                    onClick={() => setError(null)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Header */}
            <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm">
              <h1 className="text-2xl font-bold text-violet-500 mb-2">Queue Management</h1>
              <p className="text-gray-600">Manage patient queue and appointments</p>
            </div>

            {/* Queue Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
                <div className="text-2xl font-bold text-yellow-600">{queue.filter(q => q.status === 'waiting').length}</div>
                <div className="text-sm text-gray-600">Waiting</div>
              </div>
              <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
                <div className="text-2xl font-bold text-blue-600">{queue.filter(q => q.status === 'with-doctor').length}</div>
                <div className="text-sm text-gray-600">With Doctor</div>
              </div>
              <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
                <div className="text-2xl font-bold text-green-600">{queue.filter(q => q.status === 'completed').length}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="bg-white border border-gray-200 p-4 rounded-xl shadow-sm">
                <div className="text-2xl font-bold text-purple-600">{queue.length}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Add to Queue Form */}
              <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="text-xl font-bold text-white mb-4">Add Patient to Queue</h2>
                <form onSubmit={handleAddToQueue} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Patient Name *
                    </label>
                    <input
                      type="text"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      className={`w-full bg-gray-700 text-white px-3 py-2 rounded border ${
                        validationErrors.patientName ? 'border-red-500' : 'border-gray-600'
                      }`}
                      placeholder="Enter patient name"
                      disabled={isSubmitting}
                    />
                    {validationErrors.patientName && (
                      <p className="text-red-400 text-sm mt-1">{validationErrors.patientName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Phone Number
                    </label>
                    <input
                      type="tel"
                      value={patientPhone}
                      onChange={(e) => setPatientPhone(e.target.value)}
                      className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
                      placeholder="Enter phone number"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Preferred Doctor
                    </label>
                    <select
                      value={selectedDoctorId}
                      onChange={(e) => setSelectedDoctorId(e.target.value)}
                      className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
                      disabled={isSubmitting}
                    >
                      <option value="">Any Available Doctor</option>
                      {doctors.filter(d => d.status === 'available').map(doctor => (
                        <option key={doctor.id} value={doctor.id.toString()}>
                          {doctor.name} - {doctor.specialization}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Priority
                    </label>
                    <select
                      value={priority}
                      onChange={(e) => setPriority(e.target.value as 'normal' | 'urgent')}
                      className="w-full bg-gray-700 text-white px-3 py-2 rounded border border-gray-600"
                      disabled={isSubmitting}
                    >
                      <option value="normal">Normal</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !patientName.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-2 px-4 rounded flex items-center justify-center gap-2"
                  >
                    {isSubmitting && <LoadingSpinner size="sm" />}
                    Add to Queue
                  </button>
                </form>
              </div>

              {/* Queue Actions */}
              <div className="bg-gray-800 p-6 rounded-lg">
                <h2 className="text-xl font-bold text-white mb-4">Queue Actions</h2>
                <div className="space-y-3">
                  <button
                    onClick={callNextPatient}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded"
                  >
                    Call Next Patient
                  </button>
                  <button
                    onClick={loadData}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white py-2 px-4 rounded"
                  >
                    Refresh Queue
                  </button>
                </div>
              </div>
            </div>

            {/* Current Queue */}
            <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm">
              <h2 className="text-xl font-bold text-violet-500 mb-4 flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Current Queue
              </h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {queue.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    No patients in queue
                  </div>
                ) : (
                  queue
                    .sort((a, b) => {
                      if (a.priority === 'urgent' && b.priority === 'normal') return -1;
                      if (a.priority === 'normal' && b.priority === 'urgent') return 1;
                      return a.queueNumber - b.queueNumber;
                    })
                    .map((item) => (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-center">
                            <div className="h-10 w-10 bg-primary-light rounded-full flex items-center justify-center">
                              <span className="text-lg font-bold text-primary-dark">#{item.queueNumber}</span>
                            </div>
                            {item.priority === 'urgent' && (
                              <div className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs mt-1">
                                <AlertTriangle className="h-3 w-3" />
                                Urgent
                              </div>
                            )}
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">{item.patientName}</div>
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Arrival: {formatTime(item.arrivalTime)}
                            </div>
                            {item.patientPhone && (
                              <div className="text-sm text-gray-500 flex items-center gap-1">
                                <Phone className="h-3 w-3" />
                                {item.patientPhone}
                              </div>
                            )}
                            {item.doctor && (
                              <div className="text-sm text-gray-500 flex items-center gap-1">
                                <UserCheck className="h-3 w-3" />
                                Dr. {item.doctor.name}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <select
                            value={item.status}
                            onChange={(e) => updateQueueStatus(item.id, e.target.value as any)}
                            className="bg-gray-50 border border-gray-300 text-gray-900 px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-primary"
                          >
                            <option value="waiting">Waiting</option>
                            <option value="with-doctor">With Doctor</option>
                            <option value="completed">Completed</option>
                            <option value="canceled">Canceled</option>
                          </select>
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(item.status)}`}>
                            {item.status.charAt(0).toUpperCase() + item.status.slice(1).replace('-', ' ')}
                          </span>
                          <button
                            onClick={() => removeFromQueue(item.id)}
                            className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
                            title="Remove from queue"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>
      </LoadingOverlay>
    </ProtectedRoute>
  );
}
