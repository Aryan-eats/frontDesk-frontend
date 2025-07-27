'use client';

import { useState, useEffect } from 'react';
import { LoadingOverlay, LoadingSpinner } from '../../components/LoadingSpinner';
import ProtectedRoute from '../../components/ProtectedRoute';
import { useQueue, useDoctors, queueMutations } from '../../hooks/useApi';
import { validateRequired } from '../../utils/validation';
import { ErrorHandler } from '../../utils/errorHandler';
import { 
  Users, 
  Clock, 
  Phone, 
  UserCheck, 
  X,
  AlertTriangle
} from 'lucide-react';

export default function QueuePage() {
  // Use SWR hooks for data fetching with shared cache
  const { data: queue = [], error: queueError, isLoading: queueLoading, mutate: mutateQueue } = useQueue();
  const { data: doctors = [], error: doctorsError, isLoading: doctorsLoading } = useDoctors();
  
  const [patientName, setPatientName] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('');
  const [priority, setPriority] = useState<'normal' | 'urgent'>('normal');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [updatingStatus, setUpdatingStatus] = useState<number | null>(null); // Track which item is being updated
  const [justUpdated, setJustUpdated] = useState<number | null>(null); // Track recently updated item for visual feedback
  const [queuePriorities, setQueuePriorities] = useState<Record<number, 'normal' | 'urgent'>>({}); // Store priorities locally

  const isLoading = queueLoading || doctorsLoading;

  // Handle errors from SWR with proper cleanup to prevent loops
  const dataError = queueError || doctorsError;
  useEffect(() => {
    if (dataError && !error) {
      // Use enhanced error message if available
      const errorDetails = ErrorHandler.createApiError(dataError);
      setError(errorDetails.userMessage);
    } else if (!dataError && error) {
      // Clear error when SWR errors are resolved
      setError(null);
    }
  }, [dataError, error]);

  const validateForm = () => {
    const errors: Record<string, string> = {};
    
    if (!validateRequired(patientName)) {
      errors.patientName = 'Patient name required';
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
      
      const newQueueItem = await queueMutations.add({
        patientName: patientName.trim(),
        patientPhone: patientPhone.trim() || undefined,
        doctorId: selectedDoctorId ? parseInt(selectedDoctorId) : undefined
      });
      
      // Store priority locally if it's urgent
      if (priority === 'urgent') {
        setQueuePriorities(prev => ({
          ...prev,
          [newQueueItem.id]: 'urgent'
        }));
      }
      
      setPatientName('');
      setPatientPhone('');
      setSelectedDoctorId('');
      setPriority('normal');
      setValidationErrors({});
    } catch (err: unknown) {
      setError('Failed to add patient');
      console.error('Error adding patient:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateQueueStatus = async (id: number, status: 'waiting' | 'with-doctor' | 'completed') => {
    try {
      setError(null);
      setUpdatingStatus(id); // Set loading state for this specific item
      
      console.log(`Attempting to update queue item ${id} to status: ${status}`);
      
      // Store the current item state for rollback
      const currentItem = queue.find(item => item.id === id);
      if (!currentItem) {
        throw new Error('Queue item not found');
      }
      
      await queueMutations.updateStatus(id, status);
      
      // Show success feedback
      setJustUpdated(id);
      setTimeout(() => setJustUpdated(null), 2000); // Clear after 2 seconds
      
      console.log(`Successfully updated queue item ${id} to status: ${status}`);
    } catch (err: unknown) {
      console.error('Error updating queue status:', err);
      
      // Provide more specific error messages
      if (err instanceof Error) {
        console.error('Error details:', err.message);
        if (err.message.includes('401')) {
          setError('Authentication failed. Please log in again.');
        } else if (err.message.includes('404')) {
          setError('Patient not found in queue.');
        } else if (err.message.includes('400')) {
          setError('Invalid status update request.');
        } else if (err.message.includes('403')) {
          setError('Permission denied. You are not authorized to update queue status.');
        } else if (err.message.includes('500')) {
          setError('Server error. Please try again later.');
        } else if (err.message.includes('network')) {
          setError('Network error. Please check your connection.');
        } else {
          setError(`Failed to update status: ${err.message}`);
        }
      } else {
        setError('Failed to update queue status. Please try again.');
      }
      
      // Force refresh the queue data to ensure consistency
      await mutateQueue();
    } finally {
      setUpdatingStatus(null); // Clear loading state
    }
  };

  const removeFromQueue = async (id: number) => {
    try {
      await queueMutations.remove(id);
      // Clean up local priority storage
      setQueuePriorities(prev => {
        const updated = { ...prev };
        delete updated[id];
        return updated;
      });
    } catch (err: unknown) {
      setError('Failed to remove patient from queue.');
      console.error('Error removing patient:', err);
    }
  };

  const callNextPatient = async () => {
    try {
      // This would need to be implemented in the API and queueMutations
      // For now, let's just refresh the data
      await mutateQueue();
    } catch (err: unknown) {
      setError('Failed to call next patient.');
      console.error('Error calling next patient:', err);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-500';
      case 'with-doctor': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
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
                    className="text-red-400 hover:text-red-300 p-1"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}

            {/* Header */}
            <div className="bg-white border border-gray-200 p-6 md:p-8 rounded-xl shadow-sm">
              <h1 className="text-2xl md:text-3xl font-bold text-violet-500 mb-2">Queue Management</h1>
              <p className="text-base md:text-lg text-gray-600">Manage patient queue and appointments</p>
            </div>

            {/* Queue Stats */}
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-6">
              <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm">
                <div className="text-3xl font-bold text-yellow-600">{queue.filter(q => q.status === 'waiting').length}</div>
                <div className="text-sm text-gray-600">Waiting</div>
              </div>
              <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm">
                <div className="text-3xl font-bold text-blue-600">{queue.filter(q => q.status === 'with-doctor').length}</div>
                <div className="text-sm text-gray-600">With Doctor</div>
              </div>
              <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm">
                <div className="text-3xl font-bold text-green-600">{queue.filter(q => q.status === 'completed').length}</div>
                <div className="text-sm text-gray-600">Completed</div>
              </div>
              <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm">
                <div className="text-3xl font-bold text-purple-600">{queue.length}</div>
                <div className="text-sm text-gray-600">Total</div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              {/* Add to Queue Form */}
              <div className="bg-gray-800 p-6 md:p-8 rounded-lg">
                <h2 className="text-xl md:text-2xl font-bold text-white mb-6">Add Patient to Queue</h2>
                <form onSubmit={handleAddToQueue} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">
                      Patient Name *
                    </label>
                    <input
                      type="text"
                      value={patientName}
                      onChange={(e) => setPatientName(e.target.value)}
                      className={`w-full bg-gray-700 text-white px-4 py-3 rounded border ${
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
                      className="w-full bg-gray-700 text-white px-4 py-3 rounded border border-gray-600"
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
                      className="w-full bg-gray-700 text-white px-4 py-3 rounded border border-gray-600"
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
                      className="w-full bg-gray-700 text-white px-4 py-3 rounded border border-gray-600"
                      disabled={isSubmitting}
                    >
                      <option value="normal">Normal</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || !patientName.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-3 px-4 rounded flex items-center justify-center gap-2 transition-colors"
                  >
                    {isSubmitting && <LoadingSpinner size="sm" />}
                    Add to Queue
                  </button>
                </form>
              </div>

              {/* Queue Actions */}
              <div className="bg-gray-800 p-6 md:p-8 rounded-lg">
                <h2 className="text-xl md:text-2xl font-bold text-white mb-6">Queue Actions</h2>
                <div className="space-y-4">
                  <button
                    onClick={callNextPatient}
                    className="w-full bg-green-600 hover:bg-green-700 text-white py-3 px-4 rounded transition-colors"
                  >
                    Call Next Patient
                  </button>
                  <button
                    onClick={() => mutateQueue()}
                    className="w-full bg-gray-600 hover:bg-gray-700 text-white py-3 px-4 rounded transition-colors"
                  >
                    Refresh Queue
                  </button>
                </div>
              </div>
            </div>

            {/* Current Queue */}
            <div className="bg-white border border-gray-200 p-6 md:p-8 rounded-xl shadow-sm">
              <h2 className="text-xl md:text-2xl font-bold text-violet-500 mb-6 flex items-center gap-2">
                <Users className="h-6 w-6 text-primary" />
                Current Queue
              </h2>
              <div className="space-y-4 max-h-96 overflow-y-auto">
                {queue.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p>No patients in queue</p>
                  </div>
                ) : (
                  queue
                    .sort((a, b) => {
                      // Sort by priority first (urgent patients first), then by queue number
                      const aIsUrgent = queuePriorities[a.id] === 'urgent';
                      const bIsUrgent = queuePriorities[b.id] === 'urgent';
                      
                      if (aIsUrgent && !bIsUrgent) return -1;
                      if (!aIsUrgent && bIsUrgent) return 1;
                      
                      return a.queueNumber - b.queueNumber;
                    })
                    .map((item) => (
                      <div key={item.id} className={`flex flex-col space-y-4 xl:flex-row xl:items-center xl:justify-between xl:space-y-0 p-4 md:p-6 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors ${
                        justUpdated === item.id ? 'ring-2 ring-green-500 bg-green-50' : ''
                      }`}>
                        <div className="flex items-start gap-4">
                          <div className="flex flex-col items-center flex-shrink-0">
                            <div className="h-12 w-12 bg-primary-light rounded-full flex items-center justify-center">
                              <span className="text-lg font-bold text-primary-dark">#{item.queueNumber}</span>
                            </div>
                            {queuePriorities[item.id] === 'urgent' && (
                              <div className="mt-1 px-2 py-1 bg-red-500 text-white text-xs rounded-full flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3" />
                                Urgent
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-gray-900 text-lg">{item.patientName}</div>
                            <div className="text-sm text-gray-500 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1">
                              <div className="flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                Arrival: {formatTime(item.arrivalTime)}
                              </div>
                              {item.patientPhone && (
                                <>
                                  <span className="hidden sm:inline">•</span>
                                  <div className="flex items-center gap-1">
                                    <Phone className="h-3 w-3" />
                                    <span>{item.patientPhone}</span>
                                  </div>
                                </>
                              )}
                            </div>
                            {item.doctor && (
                              <div className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                                <UserCheck className="h-3 w-3" />
                                <span>Dr. {item.doctor.name}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-shrink-0">
                          <select
                            value={item.status}
                            onChange={(e) => updateQueueStatus(item.id, e.target.value as 'waiting' | 'with-doctor' | 'completed')}
                            disabled={updatingStatus === item.id}
                            className={`w-full sm:w-auto bg-gray-50 border border-gray-300 text-gray-900 px-3 py-2 rounded-lg focus:ring-2 focus:ring-primary ${
                              updatingStatus === item.id ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                          >
                            <option value="waiting">Waiting</option>
                            <option value="with-doctor">With Doctor</option>
                            <option value="completed">Completed</option>
                          </select>
                          <div className="flex items-center gap-3 w-full sm:w-auto">
                            {updatingStatus === item.id ? (
                              <div className="px-4 py-2 rounded-full text-sm font-medium text-gray-600 bg-gray-200 flex items-center gap-2">
                                <LoadingSpinner size="sm" />
                                Updating...
                              </div>
                            ) : (
                              <span className={`px-4 py-2 rounded-full text-sm font-medium text-white ${getStatusColor(item.status)} flex-1 sm:flex-initial text-center`}>
                                {item.status.charAt(0).toUpperCase() + item.status.slice(1).replace('-', ' ')}
                              </span>
                            )}
                            <button
                              onClick={() => removeFromQueue(item.id)}
                              disabled={updatingStatus === item.id}
                              className={`text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors ${
                                updatingStatus === item.id ? 'opacity-50 cursor-not-allowed' : ''
                              }`}
                              title="Remove from queue"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
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
