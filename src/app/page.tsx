'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../contexts/AuthContext';
import { LoadingOverlay, LoadingSpinner } from '../components/LoadingSpinner';
import ProtectedRoute from '../components/ProtectedRoute';
import { apiService, QueueItem, Doctor, Appointment } from '../services/api';
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

export default function HomePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('All');
  const [newPatientName, setNewPatientName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAddingPatient, setIsAddingPatient] = useState(false);
  const [showAddPatient, setShowAddPatient] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const [queueData, doctorsData, appointmentsData] = await Promise.all([
        apiService.getQueue(),
        apiService.getDoctors(),
        apiService.getAppointments()
      ]);
      
      setQueue(queueData);
      setDoctors(doctorsData);
      setAppointments(appointmentsData);
    } catch (err: any) {
      setError('Failed to load data. Please try again.');
      console.error('Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredQueue = queue.filter(item => {
    const matchesSearch = item.patientName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterStatus === 'All' || item.status === filterStatus.toLowerCase().replace(' ', '-');
    return matchesSearch && matchesFilter;
  });

  const addNewPatient = async () => {
    if (!newPatientName.trim()) return;
    
    try {
      setIsAddingPatient(true);
      setError(null);
      
      const newPatient = await apiService.addToQueue({
        patientName: newPatientName.trim(),
        priority: 'normal'
      });
      
      setQueue(prev => [...prev, newPatient]);
      setNewPatientName('');
    } catch (err: any) {
      setError('Failed to add patient to queue.');
      console.error('Error adding patient:', err);
    } finally {
      setIsAddingPatient(false);
    }
  };

  const removePatient = async (id: number) => {
    try {
      await apiService.removeFromQueue(id);
      setQueue(prev => prev.filter(item => item.id !== id));
    } catch (err: any) {
      setError('Failed to remove patient from queue.');
      console.error('Error removing patient:', err);
    }
  };

  const updatePatientStatus = async (id: number, status: 'waiting' | 'with-doctor' | 'completed' | 'canceled') => {
    try {
      const updatedPatient = await apiService.updateQueueItem(id, { status } as any);
      setQueue(prev => prev.map(item => item.id === id ? updatedPatient : item));
    } catch (err: any) {
      setError('Failed to update patient status.');
      console.error('Error updating patient status:', err);
    }
  };

  const getStatusColor = (status: string) => {
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
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  return (
    <ProtectedRoute>
      <LoadingOverlay isLoading={isLoading} message="Loading dashboard...">
        <div className="min-h-screen bg-white">
          <div className="p-6 space-y-6">
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

            {/* Welcome Section */}
            <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Welcome back, <span className="text-violet-500">{user?.fullName || user?.username || 'User'}!</span>
              </h1>
              <p className="text-gray-600">
                Here's your front desk dashboard overview
              </p>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-white border border-border-color p-6 rounded-xl shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-primary">{queue.filter(q => q.status === 'waiting').length}</div>
                    <div className="text-sm text-text-subtle font-medium">Patients Waiting</div>
                  </div>
                  <div className="h-12 w-12 bg-accent rounded-lg flex items-center justify-center">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                </div>
              </div>
              <div className="bg-white border border-border-color p-6 rounded-xl shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-green-600">{doctors.filter(d => d.status === 'available').length}</div>
                    <div className="text-sm text-text-subtle font-medium">Available Doctors</div>
                  </div>
                  <div className="h-12 w-12 bg-green-50 rounded-lg flex items-center justify-center">
                    <UserCheck className="h-6 w-6 text-green-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white border border-border-color p-6 rounded-xl shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-amber-600">{queue.filter(q => q.status === 'with-doctor').length}</div>
                    <div className="text-sm text-text-subtle font-medium">In Progress</div>
                  </div>
                  <div className="h-12 w-12 bg-amber-50 rounded-lg flex items-center justify-center">
                    <Activity className="h-6 w-6 text-amber-600" />
                  </div>
                </div>
              </div>
              <div className="bg-white border border-border-color p-6 rounded-xl shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-3xl font-bold text-primary-dark">{appointments.filter(a => a.status === 'booked').length}</div>
                    <div className="text-sm text-text-subtle font-medium">Today's Appointments</div>
                  </div>
                  <div className="h-12 w-12 bg-accent rounded-lg flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-primary-dark" />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-600" />
                Quick Actions
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <button
                  onClick={() => router.push('/queue')}
                  className="bg-blue-50 hover:bg-blue-100 border border-blue-200 text-blue-700 p-4 rounded-lg flex flex-col items-center gap-2 transition-colors"
                >
                  <Users className="h-6 w-6" />
                  <span className="text-sm font-medium">View Queue</span>
                </button>
                <button
                  onClick={() => router.push('/appointments')}
                  className="bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 p-4 rounded-lg flex flex-col items-center gap-2 transition-colors"
                >
                  <Calendar className="h-6 w-6" />
                  <span className="text-sm font-medium">Appointments</span>
                </button>
                <button
                  onClick={() => router.push('/doctors')}
                  className="bg-purple-50 hover:bg-purple-100 border border-purple-200 text-purple-700 p-4 rounded-lg flex flex-col items-center gap-2 transition-colors"
                >
                  <UserCheck className="h-6 w-6" />
                  <span className="text-sm font-medium">Doctors</span>
                </button>
                <button
                  onClick={() => setShowAddPatient(true)}
                  className="bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-700 p-4 rounded-lg flex flex-col items-center gap-2 transition-colors"
                >
                  <Plus className="h-6 w-6" />
                  <span className="text-sm font-medium">Add Patient</span>
                </button>
              </div>
            </div>

            {/* Queue Management and Today's Appointments Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Queue Management Section */}
              <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Users className="h-5 w-5 text-blue-600" />
                    Queue Management
                  </h2>
                  <div className="flex gap-4">
                    <select 
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="bg-gray-50 border border-gray-300 text-gray-900 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="All">All</option>
                      <option value="Waiting">Waiting</option>
                      <option value="With Doctor">With Doctor</option>
                      <option value="Completed">Completed</option>
                    </select>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Search patients"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="bg-gray-50 border border-gray-300 text-gray-900 px-3 py-2 pl-10 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    </div>
                  </div>
                </div>

                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {filteredQueue.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <Users className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      No patients in queue
                    </div>
                  ) : (
                    filteredQueue.map((item, index) => (
                      <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="flex items-center gap-4">
                          <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-bold text-blue-600">{item.queueNumber}</span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-gray-900">{item.patientName}</span>
                              {item.priority === 'urgent' && (
                                <div className="flex items-center gap-1 bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs">
                                  <AlertTriangle className="h-3 w-3" />
                                  Urgent
                                </div>
                              )}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              Arrival: {formatTime(item.arrivalTime)}
                              {item.estimatedWaitTime && ` | Est. Wait: ${item.estimatedWaitTime} min`}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <select 
                            value={item.status}
                            onChange={(e) => updatePatientStatus(item.id, e.target.value as any)}
                            className="bg-gray-50 border border-gray-300 text-gray-900 px-3 py-2 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
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
                            onClick={() => removePatient(item.id)}
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

                <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex gap-3">
                    <input
                      type="text"
                      placeholder="Add New Patient to Queue"
                      value={newPatientName}
                      onChange={(e) => setNewPatientName(e.target.value)}
                      className="flex-1 bg-gray-50 border border-gray-300 text-gray-900 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-500"
                      onKeyPress={(e) => e.key === 'Enter' && addNewPatient()}
                      disabled={isAddingPatient}
                    />
                    <button 
                      onClick={addNewPatient}
                      disabled={isAddingPatient || !newPatientName.trim()}
                      className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                      {isAddingPatient ? <LoadingSpinner size="sm" /> : <Plus className="h-4 w-4" />}
                      Add Patient
                    </button>
                  </div>
                </div>
              </div>

              {/* Today's Appointments Section */}
              <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-blue-600" />
                    Today's Appointments
                  </h2>
                  <button 
                    onClick={loadData}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2 transition-colors"
                  >
                    <Activity className="h-4 w-4" />
                    Refresh
                  </button>
                </div>
                
                <div className="space-y-3">
                  {appointments.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                      No appointments for today
                    </div>
                  ) : (
                    appointments.slice(0, 5).map((appointment) => (
                      <div key={appointment.id} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                        <div>
                          <div className="font-semibold text-gray-900">{appointment.patientName}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(appointment.appointmentTime)} - {appointment.doctor.name}
                          </div>
                          <div className="text-sm text-gray-500">{appointment.doctor.specialization}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(appointment.status)}`}>
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
            <div className="bg-white border border-gray-200 p-6 rounded-xl shadow-sm">
              <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-blue-600" />
                Available Doctors
              </h2>
              <div className="space-y-3">
                {doctors.length === 0 ? (
                  <div className="text-center text-gray-500 py-8">
                    <UserCheck className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    No doctors on duty
                  </div>
                ) : (
                  doctors.map((doctor) => (
                    <div key={doctor.id} className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                          <span className="text-blue-600 font-bold text-lg">
                            {doctor.name.split(' ').map((n: string) => n[0]).join('').substring(0, 2)}
                          </span>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">{doctor.name}</div>
                          <div className="text-sm text-gray-500">{doctor.specialization}</div>
                          <div className="text-sm text-gray-500">{doctor.location}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(doctor.status)}`}>
                          {doctor.status.charAt(0).toUpperCase() + doctor.status.slice(1).replace('-', ' ')}
                        </span>
                        <div className="text-right">
                          <div className="text-sm text-gray-500">Email: {doctor.email || 'N/A'}</div>
                          <div className="text-sm text-gray-500">Phone: {doctor.phone || 'N/A'}</div>
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
