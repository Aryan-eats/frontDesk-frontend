import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

const API_BASE_URL = process.env.NODE_ENV === 'production' 
  ? 'https://frontdesk-sigma.vercel.app' 
  : 'http://localhost:3000';

const FALLBACK_API_URL = process.env.NEXT_PUBLIC_API_URL || API_BASE_URL;

// Types
export interface User {
  id: number;
  username: string;
  fullName: string;
  role: string;
  createdAt: string;
}

export interface Doctor {
  id: number;
  name: string;
  specialization: string;
  gender: string;
  location: string;
  phone?: string;
  availability?: { day: string; startTime: string; endTime: string }[];
  status: 'available' | 'busy' | 'off-duty';
  createdAt: string;
}

export interface Appointment {
  id: number;
  patientName: string;
  patientPhone?: string;
  appointmentTime: string;
  status: 'booked' | 'completed' | 'canceled';
  doctor: Doctor;
  doctorId: number;
  createdAt: string;
}

export interface QueueItem {
  id: number;
  patientName: string;
  patientPhone?: string;
  queueNumber: number;
  status: 'waiting' | 'with-doctor' | 'completed';
  doctor?: Doctor;
  doctorId?: number;
  arrivalTime: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
}

export interface LoginRequest {
  username: string;
  password: string;
}

export interface SignUpRequest {
  username: string;
  password: string;
  email: string;
  fullName: string;
  role: string;
}

export interface CreateDoctorRequest {
  name: string;
  specialization: string;
  gender: string;
  location: string;
  phone?: string;
  availability?: { day: string; startTime: string; endTime: string }[];
}

export interface CreateAppointmentRequest {
  patientName: string;
  patientPhone?: string;
  appointmentTime: string;
  doctorId: number;
}

export interface CreateQueueRequest {
  patientName: string;
  patientPhone?: string;
  doctorId?: number;
}

export interface UpdateQueueRequest {
  patientName?: string;
  patientPhone?: string;
  status?: 'waiting' | 'with-doctor' | 'completed';
}

class ApiService {
  private api: AxiosInstance;
  private retryCount = 0;
  private maxRetries = 3;
  private isRedirecting = false;

  constructor() {
    this.api = axios.create({
      baseURL: FALLBACK_API_URL,
      timeout: 10000, 
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.api.interceptors.request.use(
      (config) => {
        return config;
      },
      (error) => {
        console.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    this.api.interceptors.response.use(
      (response) => {
        this.retryCount = 0; 
        return response;
      },
      (error: AxiosError) => {
        console.error('API Error:', error.response?.status, error.message);
        
        if (error.response?.status === 401 && !this.isRedirecting) {
          this.isRedirecting = true;
          
          if (typeof window !== 'undefined') {
            localStorage.removeItem('accessToken');
            localStorage.removeItem('user');
            
            setTimeout(() => {
              window.location.href = '/login';
              this.isRedirecting = false;
            }, 100);
          }
        }
        
        return Promise.reject(error);
      }
    );
  }

  private async retryRequest<T>(request: () => Promise<T>): Promise<T> {
    try {
      const result = await request();
      this.retryCount = 0; 
      return result;
    } catch (error) {
      if (this.retryCount < this.maxRetries && this.shouldRetry(error as AxiosError)) {
        this.retryCount++;
        const delay = Math.min(1000 * Math.pow(2, this.retryCount), 10000); 
        console.log(`Retrying request in ${delay}ms (attempt ${this.retryCount}/${this.maxRetries})`);
        
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryRequest(request);
      }
      throw error;
    }
  }

  private shouldRetry(error: AxiosError): boolean {
    if (error.response) {
      const status = error.response.status;
      return status >= 500 || status === 429 || status === 408; 
    }
    
    return error.code === 'ECONNABORTED' || error.code === 'ENOTFOUND' || !error.response;
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    return this.retryRequest(async () => {
      const response: AxiosResponse<AuthResponse> = await this.api.post('/auth/login', credentials);
      return response.data;
    });
  }

  async signup(userData: SignUpRequest): Promise<AuthResponse> {
    return this.retryRequest(async () => {
      const response: AxiosResponse<AuthResponse> = await this.api.post('/auth/signup', userData);
      return response.data;
    });
  }

  async getDoctors(): Promise<Doctor[]> {
    return this.retryRequest(async () => {
      const response: AxiosResponse<Doctor[]> = await this.api.get('/doctors');
      return response.data;
    });
  }

  async getAvailableDoctors(): Promise<Doctor[]> {
    return this.retryRequest(async () => {
      const response: AxiosResponse<Doctor[]> = await this.api.get('/doctors/available');
      return response.data;
    });
  }

  async searchDoctors(specialization?: string, location?: string): Promise<Doctor[]> {
    const params: any = {};
    if (specialization) params.specialization = specialization;
    if (location) params.location = location;
    
    const response: AxiosResponse<Doctor[]> = await this.api.get('/doctors', { params });
    return response.data;
  }

  async getDoctor(id: number): Promise<Doctor> {
    const response: AxiosResponse<Doctor> = await this.api.get(`/doctors/${id}`);
    return response.data;
  }

  async createDoctor(doctor: CreateDoctorRequest): Promise<Doctor> {
    const response: AxiosResponse<Doctor> = await this.api.post('/doctors', doctor);
    return response.data;
  }

  async updateDoctor(id: number, doctor: Partial<CreateDoctorRequest>): Promise<Doctor> {
    const response: AxiosResponse<Doctor> = await this.api.patch(`/doctors/${id}`, doctor);
    return response.data;
  }

  async deleteDoctor(id: number): Promise<void> {
    await this.api.delete(`/doctors/${id}`);
  }

  async getAppointments(): Promise<Appointment[]> {
    return this.retryRequest(async () => {
      const response: AxiosResponse<Appointment[]> = await this.api.get('/appointments');
      return response.data;
    });
  }

  async getTodayAppointments(): Promise<Appointment[]> {
    return this.retryRequest(async () => {
      const response: AxiosResponse<Appointment[]> = await this.api.get('/appointments/today');
      return response.data;
    });
  }

  async createAppointment(appointment: CreateAppointmentRequest): Promise<Appointment> {
    return this.retryRequest(async () => {
      const response: AxiosResponse<Appointment> = await this.api.post('/appointments', appointment);
      return response.data;
    });
  }

  async updateAppointment(id: number, appointment: Partial<CreateAppointmentRequest>): Promise<Appointment> {
    return this.retryRequest(async () => {
      const response: AxiosResponse<Appointment> = await this.api.patch(`/appointments/${id}`, appointment);
      return response.data;
    });
  }

  async deleteAppointment(id: number): Promise<void> {
    return this.retryRequest(async () => {
      await this.api.delete(`/appointments/${id}`);
    });
  }

  async getQueue(): Promise<QueueItem[]> {
    return this.retryRequest(async () => {
      const response: AxiosResponse<QueueItem[]> = await this.api.get('/queue');
      return response.data;
    });
  }

  async getTodayQueue(): Promise<QueueItem[]> {
    return this.retryRequest(async () => {
      const response: AxiosResponse<QueueItem[]> = await this.api.get('/queue/today');
      return response.data;
    });
  }

  async addToQueue(queueItem: CreateQueueRequest): Promise<QueueItem> {
    const response: AxiosResponse<QueueItem> = await this.api.post('/queue', queueItem);
    return response.data;
  }

  async updateQueueItem(id: number, queueItem: UpdateQueueRequest): Promise<QueueItem> {
    const response: AxiosResponse<QueueItem> = await this.api.patch(`/queue/${id}`, queueItem);
    return response.data;
  }

  async removeFromQueue(id: number): Promise<void> {
    await this.api.delete(`/queue/${id}`);
  }

  async testConnection(): Promise<boolean> {
    try {
      const response = await this.api.get('/health', {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      console.warn('Connection test failed:', error);
      return false;
    }
  }

  async checkHealth(): Promise<{ status: string; timestamp: string }> {
    return this.retryRequest(async () => {
      const response = await this.api.get('/health');
      return response.data;
    });
  }
}

export const apiService = new ApiService();
export default apiService;
