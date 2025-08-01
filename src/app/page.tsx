'use client';

import React, { useEffect, useState, useMemo, useCallback, memo } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthState } from '../contexts/AuthContext';
import { LoadingSpinner } from '../components/LoadingSpinner';
import ProtectedRoute from '../components/ProtectedRoute';
import ClientOnly from '../components/ClientOnly';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { 
  useTodayQueue, 
  useDoctors, 
  useTodayAppointments, 
  queueMutations 
} from '../hooks/useApi';
import { 
  Search, 
  X, 
  Plus, 
  Clock, 
  AlertTriangle,
  Users,
  UserCheck,
  Calendar,
  Activity
} from 'lucide-react';

// Memoized dashboard stats component
const DashboardStats = memo(({ 
  waitingCount, 
  availableDoctorsCount, 
  inProgressCount, 
  appointmentsCount 
}: {
  waitingCount: number;
  availableDoctorsCount: number;
  inProgressCount: number;
  appointmentsCount: number;
}) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
    <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-3xl font-bold text-violet-600">{waitingCount}</div>
          <div className="text-sm text-gray-600 font-medium">Patients Waiting</div>
        </div>
        <div className="h-12 w-12 bg-violet-50 rounded-lg flex items-center justify-center">
          <Users className="h-6 w-6 text-violet-600" />
        </div>
      </div>
    </div>
    <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-3xl font-bold text-green-600">{availableDoctorsCount}</div>
          <div className="text-sm text-gray-600 font-medium">Available Doctors</div>
        </div>
        <div className="h-12 w-12 bg-green-50 rounded-lg flex items-center justify-center">
          <UserCheck className="h-6 w-6 text-green-600" />
        </div>
      </div>
    </div>
    <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-3xl font-bold text-amber-600">{inProgressCount}</div>
          <div className="text-sm text-gray-600 font-medium">In Progress</div>
        </div>
        <div className="h-12 w-12 bg-amber-50 rounded-lg flex items-center justify-center">
          <Activity className="h-6 w-6 text-amber-600" />
        </div>
      </div>
    </div>
    <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-3xl font-bold text-blue-600">{appointmentsCount}</div>
          <div className="text-sm text-gray-600 font-medium">Today&apos;s Appointments</div>
        </div>
        <div className="h-12 w-12 bg-blue-50 rounded-lg flex items-center justify-center">
          <Calendar className="h-6 w-6 text-blue-600" />
        </div>
      </div>
    </div>
  </div>
));

DashboardStats.displayName = 'DashboardStats';

function DashboardContent() {
  const { user } = useAuthState();
  const router = useRouter();

  // State and hooks for queue, doctors, appointments
  const { data: queue = [], isLoading: queueLoading, error: queueError } = useTodayQueue();
  const { data: doctors = [], isLoading: doctorsLoading, error: doctorsError } = useDoctors();
  const { data: appointments = [], isLoading: appointmentsLoading, error: appointmentsError } = useTodayAppointments();

  const [searchTerm, setSearchTerm] = useState('');
  const [newPatientName, setNewPatientName] = useState('');
  const [isAddingPatient, setIsAddingPatient] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filtered queue based on search
  const filteredQueue = useMemo(() => {
    if (!searchTerm.trim()) return queue;
    return queue.filter((item: any) =>
      item.patientName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [queue, searchTerm]);

  // Dashboard stats
  const dashboardStats = useMemo(() => {
    const waitingCount = queue.filter((q: any) => q.status === 'waiting').length;
    const availableDoctorsCount = doctors.filter((d: any) => d.status === 'available').length;
    const inProgressCount = queue.filter((q: any) => q.status === 'with-doctor').length;
    const appointmentsCount = appointments.length;
    return { waitingCount, availableDoctorsCount, inProgressCount, appointmentsCount };
  }, [queue, doctors, appointments]);

  // Memoized handlers
  const addNewPatient = useCallback(async () => {
    if (!newPatientName.trim()) return;
    try {
      setIsAddingPatient(true);
      setError(null);
      await queueMutations.add({ patientName: newPatientName.trim() });
      setNewPatientName('');
    } catch (err: unknown) {
      setError('Failed to add patient');
      console.error('Error adding patient:', err);
    } finally {
      setIsAddingPatient(false);
    }
  }, [newPatientName]);

  const removePatient = useCallback(async (id: number) => {
    try {
      await queueMutations.remove(id);
    } catch (err: unknown) {
      setError('Failed to remove patient');
      console.error('Error removing patient:', err);
    }
  }, []);

  const updatePatientStatus = useCallback(async (id: number, status: 'waiting' | 'with-doctor' | 'completed') => {
    try {
      await queueMutations.updateStatus(id, status);
    } catch (err: unknown) {
      setError('Failed to update status');
      console.error('Error updating patient status:', err);
    }
  }, []);

  const getStatusColor = useCallback((status: string) => {
    switch (status) {
      case 'waiting': return 'bg-yellow-500';
      case 'with-doctor': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'canceled': return 'bg-red-500';
      case 'available': return 'bg-green-500';
      case 'busy': return 'bg-yellow-500';
      case 'off-duty': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  }, []);

  const formatTime = useCallback((dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }, []);

  // Handle errors from SWR with proper cleanup
  useEffect(() => {
    const errors = [queueError, doctorsError, appointmentsError].filter(Boolean);
    if (errors.length > 0 && !error) {
      setError('Failed to load some data. Please refresh the page.');
    } else if (errors.length === 0 && error) {
      setError(null);
    }
  }, [queueError, doctorsError, appointmentsError, error]);

  const isLoading = queueLoading || doctorsLoading || appointmentsLoading;

  return (
    <>
      {/* Welcome Section */}
      <div className="bg-white border border-gray-200 p-6 md:p-8 rounded-xl shadow-sm">
        <h1 className="text-2xl md:text-3xl xl:text-4xl font-bold text-gray-900 mb-2">
          Welcome back, <span className="text-violet-500">{user?.fullName || user?.username || 'User'}!</span>
        </h1>
        <p className="text-base md:text-lg text-gray-600">
          Here&apos;s your front desk dashboard overview
        </p>
      </div>

      {/* Quick Stats */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, index) => (
            <div key={index} className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm animate-pulse">
              <div className="h-8 bg-gray-200 rounded mb-2"></div>
              <div className="h-4 bg-gray-200 rounded"></div>
            </div>
          ))}
        </div>
      ) : (
        <DashboardStats {...dashboardStats} />
      )}

      {/* Quick Actions */}
      <div className="bg-white border border-gray-200 p-6 md:p-8 rounded-xl shadow-sm">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <Activity className="h-6 w-6 text-blue-600" />
          Quick Actions
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
          <button
            onClick={() => router.push('/queue')}
            className="bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 p-6 rounded-lg flex flex-col items-center gap-3 transition-colors"
          >
            <Users className="h-8 w-8" />
            <span className="text-sm font-medium">View Queue</span>
          </button>
          <button
            onClick={() => router.push('/appointments')}
            className="bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 p-6 rounded-lg flex flex-col items-center gap-3 transition-colors"
          >
            <Calendar className="h-8 w-8" />
            <span className="text-sm font-medium">Appointments</span>
          </button>
          <button
            onClick={() => router.push('/doctors')}
            className="bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 p-6 rounded-lg flex flex-col items-center gap-3 transition-colors"
          >
            <UserCheck className="h-8 w-8" />
            <span className="text-sm font-medium">Doctors</span>
          </button>
          <button
            onClick={() => router.push('/queue')}
            className="bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 p-6 rounded-lg flex flex-col items-center gap-3 transition-colors"
          >
            <Plus className="h-8 w-8" />
            <span className="text-sm font-medium">Add Patient</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg shadow-sm">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
              <span className="font-medium">{error}</span>
            </div>
            <button 
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      {/* Queue Management and Today's Appointments Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Queue Management Section */}
        <div className="bg-white border border-gray-200 p-6 md:p-8 rounded-xl shadow-sm">
          <div className="flex flex-col space-y-4 xl:flex-row xl:justify-between xl:items-center xl:space-y-0 mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Users className="h-6 w-6 text-blue-600" />
              Queue Management
            </h2>
            <div className="relative w-full sm:w-auto">
              <input
                type="text"
                placeholder="Search patients"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full sm:w-64 bg-gray-50 border border-gray-300 text-gray-900 px-4 py-2 pl-10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {queueLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="p-4 bg-gray-50 border border-gray-200 rounded-lg animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
                </div>
              ))
            ) : filteredQueue.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                No patients in queue
              </div>
            ) : (
              filteredQueue.slice(0, 5).map((item: any) => (
                <div key={item.id} className="flex flex-col space-y-4 xl:flex-row xl:items-center xl:justify-between xl:space-y-0 p-4 md:p-6 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-blue-600">{item.queueNumber}</span>
                    </div>
                    <div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                        <span className="font-semibold text-gray-900">{item.patientName}</span>
                      </div>
                      <div className="text-sm text-gray-500 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1">
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          Arrival: {formatTime(item.arrivalTime)}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                    <select 
                      value={item.status}
                      onChange={(e) => updatePatientStatus(item.id, e.target.value as 'waiting' | 'with-doctor' | 'completed')}
                      className="w-full sm:w-auto bg-gray-50 border border-gray-300 text-gray-900 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="waiting">Waiting</option>
                      <option value="with-doctor">With Doctor</option>
                      <option value="completed">Completed</option>
                    </select>
                    <div className="flex items-center gap-3 w-full sm:w-auto">
                      <span className={`px-3 py-1 rounded-full text-sm font-medium text-white ${getStatusColor(item.status)} flex-1 sm:flex-initial text-center`}>
                        {item.status.charAt(0).toUpperCase() + item.status.slice(1).replace('-', ' ')}
                      </span>
                      <button 
                        onClick={() => removePatient(item.id)}
                        className="text-red-500 hover:text-red-700 p-2 rounded-lg hover:bg-red-50 transition-colors"
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

          <div className="mt-6 p-4 md:p-6 bg-gray-50 border border-gray-200 rounded-lg">
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                placeholder="Add New Patient to Queue"
                value={newPatientName}
                onChange={(e) => setNewPatientName(e.target.value)}
                className="flex-1 bg-white border border-gray-300 text-gray-900 px-4 py-3 rounded-lg focus:ring-2 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && addNewPatient()}
                disabled={isAddingPatient}
              />
              <button 
                onClick={addNewPatient}
                disabled={isAddingPatient || !newPatientName.trim()}
                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-6 py-3 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                {isAddingPatient ? <LoadingSpinner size="sm" /> : <Plus className="h-4 w-4" />}
                Add Patient
              </button>
            </div>
          </div>
        </div>

        {/* Today's Appointments Section */}
        <div className="bg-white border border-gray-200 p-6 md:p-8 rounded-xl shadow-sm">
          <div className="flex flex-col space-y-4 xl:flex-row xl:justify-between xl:items-center xl:space-y-0 mb-6">
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Calendar className="h-6 w-6 text-blue-600" />
              Today&apos;s Appointments
            </h2>
          </div>
          <div className="space-y-4">
            {appointmentsLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="p-4 bg-gray-50 border border-gray-200 rounded-lg animate-pulse">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
                </div>
              ))
            ) : appointments.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                No appointments for today
              </div>
            ) : (
              appointments.slice(0, 5).map((appointment: any) => (
                <div key={appointment.id} className="flex flex-col space-y-3 xl:flex-row xl:items-center xl:justify-between xl:space-y-0 p-4 md:p-6 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex-1">
                    <div className="font-semibold text-gray-900 text-lg">{appointment.patientName}</div>
                    <div className="text-sm text-gray-500 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mt-1">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatTime(appointment.appointmentTime)}
                      </div>
                      <span className="hidden sm:inline">•</span>
                      <span>{appointment.doctor.name}</span>
                    </div>
                    <div className="text-sm text-gray-500 mt-1">{appointment.doctor.specialization}</div>
                  </div>
                  <div className="flex items-center justify-between sm:justify-end gap-3">
                    <span className={`px-4 py-2 rounded-full text-sm font-medium text-white ${getStatusColor(appointment.status)} flex-1 sm:flex-initial text-center`}>
                      {appointment.status.charAt(0).toUpperCase() + appointment.status.slice(1).replace('-', ' ')}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Available Doctors Section */}
      <div className="bg-white border border-gray-200 p-6 md:p-8 rounded-xl shadow-sm">
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <UserCheck className="h-6 w-6 text-blue-600" />
          Available Doctors
        </h2>
        <div className="space-y-4">
          {doctorsLoading ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="p-4 bg-gray-50 border border-gray-200 rounded-lg animate-pulse">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-3 bg-gray-200 rounded"></div>
              </div>
            ))
          ) : doctors.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              <UserCheck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              No doctors on duty
            </div>
          ) : (
            doctors.slice(0, 5).map((doctor: any) => (
              <div key={doctor.id} className="flex flex-col space-y-4 xl:flex-row xl:items-center xl:justify-between xl:space-y-0 p-4 md:p-6 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 md:w-16 md:h-16 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-blue-600 font-bold text-lg md:text-xl">
                      {doctor.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-gray-900 text-lg">{doctor.name}</div>
                    <div className="text-sm text-gray-500">{doctor.specialization}</div>
                    <div className="text-sm text-gray-500">{doctor.location}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between sm:justify-end gap-3 flex-shrink-0">
                  <span className={`px-4 py-2 rounded-full text-sm font-medium text-white ${getStatusColor(doctor.status)} flex-1 sm:flex-initial text-center`}>
                    {doctor.status.charAt(0).toUpperCase() + doctor.status.slice(1).replace('-', ' ')}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
}

export default function HomePage() {
  return (
    <ErrorBoundary>
      <ProtectedRoute>
        <div className="min-h-screen bg-gray-50">
          <div className="p-6 space-y-6">
            {/* Client-only content to prevent hydration issues */}
            <ClientOnly 
              fallback={
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <div key={index} className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm animate-pulse">
                      <div className="h-8 bg-gray-200 rounded mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded"></div>
                    </div>
                  ))}
                </div>
              }
            >
              <DashboardContent />
            </ClientOnly>
          </div>
        </div>
      </ProtectedRoute>
    </ErrorBoundary>
  );
}
