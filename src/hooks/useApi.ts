import useSWR, { SWRConfiguration, mutate } from 'swr';
import { apiService } from '../services/api';
import { Doctor, Appointment, QueueItem, CreateDoctorRequest, CreateAppointmentRequest, CreateQueueRequest, UpdateQueueRequest } from '../services/api';

// Get auth status for conditional fetching - SSR safe
const getAuthToken = () => {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('accessToken');
  } catch {
    return null;
  }
};

// Check if we're authenticated - SSR safe
const isAuthenticated = () => {
  if (typeof window === 'undefined') return false;
  return !!getAuthToken();
};

// Default SWR configuration with better stability
const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  refreshInterval: 0, // Disable automatic refresh to prevent infinite loops
  errorRetryCount: 2, // Reduce retries for faster failure feedback
  errorRetryInterval: 3000, // 3 second delay between retries
  dedupingInterval: 10000, // 10 second deduping to prevent rapid fire requests
  revalidateIfStale: true,
  revalidateOnMount: true,
  shouldRetryOnError: (error) => {
    // Don't retry auth errors
    if (error?.response?.status === 401) return false;
    if (error?.response?.status === 403) return false;
    return true;
  },
  onError: (error) => {
    // Only log non-auth errors to reduce console noise
    if (error?.response?.status !== 401 && error?.response?.status !== 403) {
      console.error('SWR Error:', error);
    }
  }
};

// Stable configuration for real-time data with longer intervals
const realTimeConfig: SWRConfiguration = {
  ...defaultConfig,
  refreshInterval: 0, // Disable auto-refresh completely to prevent issues
  dedupingInterval: 15000, // 15 second deduping for real-time data
};

// Custom hook for doctors data
export const useDoctors = (config?: SWRConfiguration) => {
  return useSWR<Doctor[]>(
    isAuthenticated() ? 'doctors' : null, // Only fetch if authenticated
    isAuthenticated() ? () => apiService.getDoctors() : null,
    { ...defaultConfig, ...config }
  );
};

// Custom hook for available doctors
export const useAvailableDoctors = (config?: SWRConfiguration) => {
  return useSWR<Doctor[]>(
    isAuthenticated() ? 'doctors/available' : null,
    isAuthenticated() ? () => apiService.getAvailableDoctors() : null,
    { ...defaultConfig, ...config }
  );
};

// Custom hook for single doctor
export const useDoctor = (id: number | null, config?: SWRConfiguration) => {
  return useSWR<Doctor>(
    isAuthenticated() && id ? `doctors/${id}` : null,
    isAuthenticated() && id ? () => apiService.getDoctor(id) : null,
    { ...defaultConfig, ...config }
  );
};

// Custom hook for appointments
export const useAppointments = (config?: SWRConfiguration) => {
  return useSWR<Appointment[]>(
    isAuthenticated() ? 'appointments' : null,
    isAuthenticated() ? () => apiService.getAppointments() : null,
    { ...defaultConfig, ...config }
  );
};

// Custom hook for today's appointments
export const useTodayAppointments = (config?: SWRConfiguration) => {
  return useSWR<Appointment[]>(
    isAuthenticated() ? 'appointments/today' : null,
    isAuthenticated() ? () => apiService.getTodayAppointments() : null,
    { ...realTimeConfig, ...config }
  );
};

// Custom hook for queue data
export const useQueue = (config?: SWRConfiguration) => {
  return useSWR<QueueItem[]>(
    isAuthenticated() ? 'queue' : null,
    isAuthenticated() ? () => apiService.getQueue() : null,
    { 
      ...realTimeConfig,
      ...config 
    }
  );
};

// Custom hook for today's queue
export const useTodayQueue = (config?: SWRConfiguration) => {
  return useSWR<QueueItem[]>(
    isAuthenticated() ? 'queue/today' : null,
    isAuthenticated() ? () => apiService.getTodayQueue() : null,
    { 
      ...realTimeConfig,
      ...config 
    }
  );
};

// Mutation helpers with debouncing and better error handling
export const doctorMutations = {
  create: async (doctorData: CreateDoctorRequest) => {
    try {
      const result = await apiService.createDoctor(doctorData);
      // Stagger mutations to prevent race conditions
      await mutate('doctors');
      setTimeout(() => mutate('doctors/available'), 100);
      return result;
    } catch (error) {
      console.error('Failed to create doctor:', error);
      throw error;
    }
  },
  
  update: async (id: number, doctorData: Partial<Doctor>) => {
    try {
      const result = await apiService.updateDoctor(id, doctorData);
      // Stagger mutations to prevent race conditions
      await mutate(`doctors/${id}`);
      setTimeout(() => mutate('doctors'), 100);
      setTimeout(() => mutate('doctors/available'), 200);
      return result;
    } catch (error) {
      console.error('Failed to update doctor:', error);
      throw error;
    }
  },
  
  delete: async (id: number) => {
    try {
      await apiService.deleteDoctor(id);
      // Stagger mutations to prevent race conditions
      await mutate('doctors');
      setTimeout(() => mutate('doctors/available'), 100);
    } catch (error) {
      console.error('Failed to delete doctor:', error);
      throw error;
    }
  },
};

export const queueMutations = {
  add: async (queueItem: CreateQueueRequest) => {
    try {
      const result = await apiService.addToQueue(queueItem);
      // Stagger mutations to prevent race conditions
      await mutate('queue/today');
      setTimeout(() => mutate('queue'), 100);
      return result;
    } catch (error) {
      console.error('Failed to add to queue:', error);
      throw error;
    }
  },
  
  updateStatus: async (id: number, status: 'waiting' | 'with-doctor' | 'completed') => {
    try {
      const result = await apiService.updateQueueItem(id, { status });
      // Stagger mutations to prevent race conditions
      await mutate('queue/today');
      setTimeout(() => mutate('queue'), 100);
      return result;
    } catch (error) {
      console.error('Failed to update queue status:', error);
      throw error;
    }
  },
  
  remove: async (id: number) => {
    try {
      await apiService.removeFromQueue(id);
      // Stagger mutations to prevent race conditions
      await mutate('queue/today');
      setTimeout(() => mutate('queue'), 100);
    } catch (error) {
      console.error('Failed to remove from queue:', error);
      throw error;
    }
  },
};

export const appointmentMutations = {
  create: async (appointmentData: CreateAppointmentRequest) => {
    try {
      const result = await apiService.createAppointment(appointmentData);
      // Stagger mutations to prevent race conditions
      await mutate('appointments/today');
      setTimeout(() => mutate('appointments'), 100);
      return result;
    } catch (error) {
      console.error('Failed to create appointment:', error);
      throw error;
    }
  },
  
  update: async (id: number, appointmentData: Partial<Appointment>) => {
    try {
      const result = await apiService.updateAppointment(id, appointmentData);
      // Stagger mutations to prevent race conditions
      await mutate('appointments/today');
      setTimeout(() => mutate('appointments'), 100);
      return result;
    } catch (error) {
      console.error('Failed to update appointment:', error);
      throw error;
    }
  },
  
  delete: async (id: number) => {
    try {
      await apiService.deleteAppointment(id);
      // Stagger mutations to prevent race conditions
      await mutate('appointments/today');
      setTimeout(() => mutate('appointments'), 100);
    } catch (error) {
      console.error('Failed to delete appointment:', error);
      throw error;
    }
  },
};
