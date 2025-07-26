import { apiService, Doctor, Appointment, QueueItem, CreateQueueRequest } from './api';

// Cache interface
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number; // Time to live in milliseconds
}

// Request deduplication
interface PendingRequest {
  promise: Promise<unknown>;
  timestamp: number;
}

class EnhancedApiService {
  private cache = new Map<string, CacheEntry<unknown>>();
  private pendingRequests = new Map<string, PendingRequest>();
  private abortControllers = new Map<string, AbortController>();
  
  // Cache TTL configurations (in milliseconds)
  private cacheTTL = {
    doctors: 5 * 60 * 1000, // 5 minutes
    userProfile: 10 * 60 * 1000, // 10 minutes
    appointments: 2 * 60 * 1000, // 2 minutes
    queue: 30 * 1000, // 30 seconds
    default: 1 * 60 * 1000, // 1 minute
  };

  private getCacheKey(endpoint: string, params?: Record<string, unknown>): string {
    return `${endpoint}${params ? JSON.stringify(params) : ''}`;
  }

  private isValidCache<T>(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  private getCachedData<T>(key: string): T | null {
    const entry = this.cache.get(key) as CacheEntry<T> | undefined;
    if (entry && this.isValidCache(entry)) {
      return entry.data;
    }
    if (entry) {
      this.cache.delete(key); // Remove expired cache
    }
    return null;
  }

  private setCachedData<T>(key: string, data: T, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl,
    });
  }

  private async makeRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
    ttl: number = this.cacheTTL.default
  ): Promise<T> {
    // Check cache first
    const cachedData = this.getCachedData<T>(key);
    if (cachedData) {
      return cachedData;
    }

    // Check for pending request (deduplication)
    const pendingRequest = this.pendingRequests.get(key);
    if (pendingRequest) {
      return pendingRequest.promise as Promise<T>;
    }

    // Create new request
    const requestPromise = requestFn()
      .then((data) => {
        this.setCachedData(key, data, ttl);
        this.pendingRequests.delete(key);
        return data;
      })
      .catch((error) => {
        this.pendingRequests.delete(key);
        throw error;
      });

    this.pendingRequests.set(key, {
      promise: requestPromise,
      timestamp: Date.now(),
    });

    return requestPromise;
  }

  // Enhanced API methods with caching
  async getDoctors(): Promise<Doctor[]> {
    const key = this.getCacheKey('doctors');
    return this.makeRequest(
      key,
      () => apiService.getDoctors(),
      this.cacheTTL.doctors
    );
  }

  async getAvailableDoctors(): Promise<Doctor[]> {
    const key = this.getCacheKey('doctors/available');
    return this.makeRequest(
      key,
      () => apiService.getAvailableDoctors(),
      this.cacheTTL.doctors
    );
  }

  async getDoctor(id: number): Promise<Doctor> {
    const key = this.getCacheKey(`doctors/${id}`);
    return this.makeRequest(
      key,
      () => apiService.getDoctor(id),
      this.cacheTTL.doctors
    );
  }

  async getAppointments(params?: { doctorId?: number; startDate?: string; endDate?: string }): Promise<Appointment[]> {
    const key = this.getCacheKey('appointments', params);
    return this.makeRequest(
      key,
      () => apiService.getAppointments(params),
      this.cacheTTL.appointments
    );
  }

  async getQueue(doctorId?: number): Promise<QueueItem[]> {
    const key = this.getCacheKey('queue', { doctorId });
    return this.makeRequest(
      key,
      () => apiService.getQueue(doctorId),
      this.cacheTTL.queue
    );
  }

  async getWaitingQueue(): Promise<QueueItem[]> {
    const key = this.getCacheKey('queue/waiting');
    return this.makeRequest(
      key,
      () => apiService.getWaitingQueue(),
      this.cacheTTL.queue
    );
  }

  // Optimistic updates - immediate cache update, then sync with server
  async updateDoctorStatusOptimistic(id: number, status: 'available' | 'busy' | 'off-duty'): Promise<Doctor> {
    // Update cache immediately
    const doctorKey = this.getCacheKey(`doctors/${id}`);
    const doctorsKey = this.getCacheKey('doctors');
    const availableDoctorsKey = this.getCacheKey('doctors/available');
    
    // Get current cached doctor
    const cachedDoctor = this.getCachedData<Doctor>(doctorKey);
    if (cachedDoctor) {
      const updatedDoctor = { ...cachedDoctor, status };
      this.setCachedData(doctorKey, updatedDoctor, this.cacheTTL.doctors);
    }

    // Invalidate related caches
    this.invalidateCache([doctorsKey, availableDoctorsKey]);

    // Make actual API call
    try {
      const result = await apiService.updateDoctorStatus(id, status);
      // Update cache with server response
      this.setCachedData(doctorKey, result, this.cacheTTL.doctors);
      return result;
    } catch (error) {
      // Revert optimistic update on error
      if (cachedDoctor) {
        this.setCachedData(doctorKey, cachedDoctor, this.cacheTTL.doctors);
      }
      throw error;
    }
  }

  async completePatientOptimistic(id: number): Promise<QueueItem> {
    // Invalidate queue caches immediately
    this.invalidateCache(['queue', 'queue/waiting']);

    try {
      return await apiService.completePatient(id);
    } catch (error) {
      // Invalidate caches again to force refresh on error
      this.invalidateCache(['queue', 'queue/waiting']);
      throw error;
    }
  }

  async addToQueueOptimistic(queueItem: CreateQueueRequest): Promise<QueueItem> {
    // Invalidate queue caches immediately
    this.invalidateCache(['queue', 'queue/waiting']);
    
    return apiService.addToQueue(queueItem);
  }

  // Cache management methods
  invalidateCache(patterns: string[]): void {
    patterns.forEach(pattern => {
      for (const key of this.cache.keys()) {
        if (key.includes(pattern)) {
          this.cache.delete(key);
        }
      }
    });
  }

  clearCache(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  // Cleanup expired cache entries
  cleanupCache(): void {
    for (const [key, entry] of this.cache.entries()) {
      if (!this.isValidCache(entry)) {
        this.cache.delete(key);
      }
    }
  }

  // Cleanup pending requests older than 30 seconds
  cleanupPendingRequests(): void {
    const now = Date.now();
    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > 30000) {
        this.pendingRequests.delete(key);
      }
    }
  }

  // Prefetch data for better performance
  async prefetchData(): Promise<void> {
    try {
      // Prefetch critical data
      await Promise.allSettled([
        this.getDoctors(),
        this.getAvailableDoctors(),
        this.getWaitingQueue(),
      ]);
    } catch (error) {
      console.warn('Prefetch failed:', error);
    }
  }

  // Get cache statistics for debugging
  getCacheStats() {
    return {
      cacheSize: this.cache.size,
      pendingRequests: this.pendingRequests.size,
      cachedKeys: Array.from(this.cache.keys()),
    };
  }

  // Enhanced status update method
  async updateQueueStatus(id: number, status: 'waiting' | 'with-doctor' | 'completed' | 'canceled') {
    // Invalidate queue caches immediately for optimistic updates
    this.invalidateCache(['queue', 'queue/waiting']);

    try {
      // Use the specific status update endpoint
      const result = await apiService.updateQueueStatus(id, status);
      return result;
    } catch (error) {
      console.warn('Status update failed:', error);
      
      // If status update fails and it's 'completed', try the complete endpoint as fallback
      if (status === 'completed') {
        try {
          return await this.completePatientOptimistic(id);
        } catch (completeError) {
          console.error('Complete patient method also failed:', completeError);
          throw error; // Throw original error
        }
      } else {
        // For other statuses, throw the original error
        throw error;
      }
    }
  }

  // Delegate non-cached methods to original API service
  login = apiService.login.bind(apiService);
  signup = apiService.signup.bind(apiService);
  createDoctor = apiService.createDoctor.bind(apiService);
  updateDoctor = apiService.updateDoctor.bind(apiService);
  deleteDoctor = apiService.deleteDoctor.bind(apiService);
  getAppointment = apiService.getAppointment.bind(apiService);
  createAppointment = apiService.createAppointment.bind(apiService);
  updateAppointment = apiService.updateAppointment.bind(apiService);
  deleteAppointment = apiService.deleteAppointment.bind(apiService);
  updateQueueItem = apiService.updateQueueItem.bind(apiService);
  callNextPatient = apiService.callNextPatient.bind(apiService);
  removeFromQueue = apiService.removeFromQueue.bind(apiService);
}

export const enhancedApiService = new EnhancedApiService();

// Start cleanup intervals
setInterval(() => {
  enhancedApiService.cleanupCache();
  enhancedApiService.cleanupPendingRequests();
}, 60000); // Run every minute

export default enhancedApiService;
