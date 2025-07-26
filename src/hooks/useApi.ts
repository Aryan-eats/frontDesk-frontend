import useSWR, { SWRConfiguration, mutate } from 'swr';
import { enhancedApiService } from '../services/enhancedApi';
import { Doctor, Appointment, QueueItem } from '../services/api';

// Default SWR configuration
const defaultConfig: SWRConfiguration = {
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  refreshInterval: 0, // Disable automatic refresh by default
  errorRetryCount: 3,
  errorRetryInterval: 1000,
  dedupingInterval: 2000,
};

// Custom hook for doctors data
export const useDoctors = (config?: SWRConfiguration) => {
  return useSWR<Doctor[]>(
    'doctors',
    () => enhancedApiService.getDoctors(),
    { ...defaultConfig, ...config }
  );
};

// Custom hook for available doctors
export const useAvailableDoctors = (config?: SWRConfiguration) => {
  return useSWR<Doctor[]>(
    'doctors/available',
    () => enhancedApiService.getAvailableDoctors(),
    { ...defaultConfig, ...config }
  );
};

// Custom hook for single doctor
export const useDoctor = (id: number | null, config?: SWRConfiguration) => {
  return useSWR<Doctor>(
    id ? `doctors/${id}` : null,
    id ? () => enhancedApiService.getDoctor(id) : null,
    { ...defaultConfig, ...config }
  );
};

// Custom hook for appointments
export const useAppointments = (
  params?: { doctorId?: number; startDate?: string; endDate?: string },
  config?: SWRConfiguration
) => {
  const key = params ? ['appointments', params] : 'appointments';
  return useSWR<Appointment[]>(
    key,
    () => enhancedApiService.getAppointments(params),
    { ...defaultConfig, ...config }
  );
};

// Custom hook for queue data
export const useQueue = (doctorId?: number, config?: SWRConfiguration) => {
  const key = doctorId ? ['queue', doctorId] : 'queue';
  return useSWR<QueueItem[]>(
    key,
    () => enhancedApiService.getQueue(doctorId),
    { 
      ...defaultConfig, 
      refreshInterval: 30000, // Refresh every 30 seconds for queue
      ...config 
    }
  );
};

// Custom hook for waiting queue
export const useWaitingQueue = (config?: SWRConfiguration) => {
  return useSWR<QueueItem[]>(
    'queue/waiting',
    () => enhancedApiService.getWaitingQueue(),
    { 
      ...defaultConfig, 
      refreshInterval: 15000, // Refresh every 15 seconds for waiting queue
      ...config 
    }
  );
};

// Mutation helpers with optimistic updates
export const doctorMutations = {
  updateStatus: async (id: number, status: 'available' | 'busy' | 'off-duty') => {
    // Optimistic update
    await mutate(`doctors/${id}`, 
      (currentDoctor: Doctor | undefined) => 
        currentDoctor ? { ...currentDoctor, status } : undefined,
      false
    );
    
    // Also update the doctors list
    await mutate('doctors', 
      (currentDoctors: Doctor[] | undefined) => 
        currentDoctors?.map(doctor => 
          doctor.id === id ? { ...doctor, status } : doctor
        ),
      false
    );
    
    // Update available doctors list
    await mutate('doctors/available');
    
    try {
      const result = await enhancedApiService.updateDoctorStatusOptimistic(id, status);
      
      // Revalidate all related data
      await Promise.all([
        mutate(`doctors/${id}`),
        mutate('doctors'),
        mutate('doctors/available'),
      ]);
      
      return result;
    } catch (error) {
      // Revert on error
      await Promise.all([
        mutate(`doctors/${id}`),
        mutate('doctors'),
        mutate('doctors/available'),
      ]);
      throw error;
    }
  },
  
  create: async (doctorData: any) => {
    try {
      const result = await enhancedApiService.createDoctor(doctorData);
      
      // Revalidate doctors data
      await Promise.all([
        mutate('doctors'),
        mutate('doctors/available'),
      ]);
      
      return result;
    } catch (error) {
      throw error;
    }
  },
  
  update: async (id: number, doctorData: any) => {
    // Optimistic update
    await mutate('doctors', 
      (currentDoctors: Doctor[] | undefined) => 
        currentDoctors?.map(doctor => 
          doctor.id === id ? { ...doctor, ...doctorData } : doctor
        ),
      false
    );
    
    try {
      const result = await enhancedApiService.updateDoctor(id, doctorData);
      
      // Revalidate doctors data
      await Promise.all([
        mutate('doctors'),
        mutate('doctors/available'),
      ]);
      
      return result;
    } catch (error) {
      // Revert on error
      await Promise.all([
        mutate('doctors'),
        mutate('doctors/available'),
      ]);
      throw error;
    }
  },
  
  delete: async (id: number) => {
    // Optimistic update
    await mutate('doctors', 
      (currentDoctors: Doctor[] | undefined) => 
        currentDoctors?.filter(doctor => doctor.id !== id),
      false
    );
    
    await mutate('doctors/available', 
      (currentDoctors: Doctor[] | undefined) => 
        currentDoctors?.filter(doctor => doctor.id !== id),
      false
    );
    
    try {
      await enhancedApiService.deleteDoctor(id);
      
      // Revalidate doctors data
      await Promise.all([
        mutate('doctors'),
        mutate('doctors/available'),
      ]);
    } catch (error) {
      // Revert on error
      await Promise.all([
        mutate('doctors'),
        mutate('doctors/available'),
      ]);
      throw error;
    }
  },
};

export const queueMutations = {
  completePatient: async (id: number) => {
    // Optimistic update - remove from waiting queue
    await mutate('queue/waiting', 
      (currentQueue: QueueItem[] | undefined) => 
        currentQueue?.filter(item => item.id !== id),
      false
    );
    
    // Update general queue
    await mutate('queue', 
      (currentQueue: QueueItem[] | undefined) => 
        currentQueue?.map(item => 
          item.id === id ? { ...item, status: 'completed' as const } : item
        ),
      false
    );
    
    try {
      // Use the enhanced status update method
      const result = await enhancedApiService.updateQueueStatus(id, 'completed');
      
      // Revalidate queue data
      await Promise.all([
        mutate('queue'),
        mutate('queue/waiting'),
      ]);
      
      return result;
    } catch (error) {
      // Revert on error
      await Promise.all([
        mutate('queue'),
        mutate('queue/waiting'),
      ]);
      throw error;
    }
  },
  
  updateStatus: async (id: number, status: 'waiting' | 'with-doctor' | 'completed' | 'canceled') => {
    // Optimistic update
    await mutate('queue', 
      (currentQueue: QueueItem[] | undefined) => 
        currentQueue?.map(item => 
          item.id === id ? { ...item, status } : item
        ),
      false
    );
    
    // Update waiting queue if relevant
    if (status === 'completed' || status === 'canceled') {
      await mutate('queue/waiting', 
        (currentQueue: QueueItem[] | undefined) => 
          currentQueue?.filter(item => item.id !== id),
        false
      );
    } else if (status === 'waiting') {
      // Add back to waiting queue if status changed to waiting
      await mutate('queue/waiting');
    }
    
    try {
      // Use the enhanced status update method
      const result = await enhancedApiService.updateQueueStatus(id, status);
      
      // Revalidate queue data
      await Promise.all([
        mutate('queue'),
        mutate('queue/waiting'),
      ]);
      
      return result;
    } catch (error) {
      console.error('All status update approaches failed:', error);
      
      // Revert optimistic update
      await Promise.all([
        mutate('queue'),
        mutate('queue/waiting'),
      ]);
      throw error;
    }
  },
  
  addToQueue: async (queueItem: any) => {
    try {
      const result = await enhancedApiService.addToQueueOptimistic(queueItem);
      
      // Revalidate queue data
      await Promise.all([
        mutate('queue'),
        mutate('queue/waiting'),
      ]);
      
      return result;
    } catch (error) {
      throw error;
    }
  },
  
  removeFromQueue: async (id: number) => {
    // Optimistic update
    await mutate('queue/waiting', 
      (currentQueue: QueueItem[] | undefined) => 
        currentQueue?.filter(item => item.id !== id),
      false
    );
    
    await mutate('queue', 
      (currentQueue: QueueItem[] | undefined) => 
        currentQueue?.filter(item => item.id !== id),
      false
    );
    
    try {
      await enhancedApiService.removeFromQueue(id);
      
      // Revalidate queue data
      await Promise.all([
        mutate('queue'),
        mutate('queue/waiting'),
      ]);
    } catch (error) {
      // Revert on error
      await Promise.all([
        mutate('queue'),
        mutate('queue/waiting'),
      ]);
      throw error;
    }
  },
};

export const appointmentMutations = {
  create: async (appointmentData: any) => {
    try {
      const result = await enhancedApiService.createAppointment(appointmentData);
      
      // Revalidate appointments data
      await mutate('appointments');
      
      return result;
    } catch (error) {
      throw error;
    }
  },
  
  update: async (id: number, appointmentData: any) => {
    // Optimistic update
    await mutate('appointments', 
      (currentAppointments: Appointment[] | undefined) => 
        currentAppointments?.map(appointment => 
          appointment.id === id ? { ...appointment, ...appointmentData } : appointment
        ),
      false
    );
    
    try {
      const result = await enhancedApiService.updateAppointment(id, appointmentData);
      
      // Revalidate appointments data
      await mutate('appointments');
      
      return result;
    } catch (error) {
      // Revert on error
      await mutate('appointments');
      throw error;
    }
  },
  
  delete: async (id: number) => {
    // Optimistic update
    await mutate('appointments', 
      (currentAppointments: Appointment[] | undefined) => 
        currentAppointments?.filter(appointment => appointment.id !== id),
      false
    );
    
    try {
      await enhancedApiService.deleteAppointment(id);
      
      // Revalidate appointments data
      await mutate('appointments');
    } catch (error) {
      // Revert on error
      await mutate('appointments');
      throw error;
    }
  },
};

// Preload critical data
export const preloadCriticalData = () => {
  // Preload doctors and queue data
  mutate('doctors', enhancedApiService.getDoctors());
  mutate('doctors/available', enhancedApiService.getAvailableDoctors());
  mutate('queue/waiting', enhancedApiService.getWaitingQueue());
};

// Clear all cached data
export const clearAllCache = () => {
  enhancedApiService.clearCache();
  // Clear SWR cache as well
  mutate(() => true, undefined, { revalidate: false });
};
