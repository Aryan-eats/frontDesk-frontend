import axios, { AxiosInstance, AxiosResponse } from 'axios';

const API_BASE_URL = 'https://frontdesk-sigma.vercel.app';

// Types
export interface User {
  id: number;
  username: string;
  email?: string;
  fullName?: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface Doctor {
  id: number;
  name: string;
  specialization: string;
  gender: string;
  location: string;
  email?: string;
  phone?: string;
  availability?: string;
  status: 'available' | 'busy' | 'off-duty';
  createdAt: string;
  updatedAt: string;
}

export interface Appointment {
  id: number;
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  appointmentTime: string;
  status: 'booked' | 'completed' | 'canceled' | 'in-progress';
  notes?: string;
  doctor: Doctor;
  doctorId: number;
  createdAt: string;
  updatedAt: string;
}

export interface QueueItem {
  id: number;
  patientName: string;
  patientPhone?: string;
  queueNumber: number;
  status: 'waiting' | 'with-doctor' | 'completed' | 'canceled';
  priority: 'normal' | 'urgent';
  estimatedWaitTime?: number;
  doctor?: Doctor;
  doctorId?: number;
  arrivalTime: string;
  updatedAt: string;
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
  email?: string;
  fullName?: string;
  role?: string;
}

export interface CreateDoctorRequest {
  name: string;
  specialization: string;
  gender: string;
  location: string;
  email?: string;
  phone?: string;
  availability?: string;
}

export interface CreateAppointmentRequest {
  patientName: string;
  patientEmail?: string;
  patientPhone?: string;
  appointmentTime: string;
  doctorId: number;
  notes?: string;
}

export interface CreateQueueRequest {
  patientName: string;
  patientPhone?: string;
  doctorId?: number;
  priority?: 'normal' | 'urgent';
}

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.api.interceptors.request.use((config) => {
      const token = localStorage.getItem('accessToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    this.api.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('user');
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await this.api.post('/auth/login', credentials);
    return response.data;
  }

  async signup(userData: SignUpRequest): Promise<AuthResponse> {
    const response: AxiosResponse<AuthResponse> = await this.api.post('/auth/signup', userData);
    return response.data;
  }

  async getDoctors(): Promise<Doctor[]> {
    const response: AxiosResponse<Doctor[]> = await this.api.get('/doctors');
    return response.data;
  }

  async getAvailableDoctors(): Promise<Doctor[]> {
    const response: AxiosResponse<Doctor[]> = await this.api.get('/doctors/available');
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

  async updateDoctorStatus(id: number, status: 'available' | 'busy' | 'off-duty'): Promise<Doctor> {
    const response: AxiosResponse<Doctor> = await this.api.patch(`/doctors/${id}/status`, { status });
    return response.data;
  }

  async deleteDoctor(id: number): Promise<void> {
    await this.api.delete(`/doctors/${id}`);
  }

  async getAppointments(params?: { doctorId?: number; startDate?: string; endDate?: string }): Promise<Appointment[]> {
    const response: AxiosResponse<Appointment[]> = await this.api.get('/appointments', { params });
    return response.data;
  }

  async getAppointment(id: number): Promise<Appointment> {
    const response: AxiosResponse<Appointment> = await this.api.get(`/appointments/${id}`);
    return response.data;
  }

  async createAppointment(appointment: CreateAppointmentRequest): Promise<Appointment> {
    const response: AxiosResponse<Appointment> = await this.api.post('/appointments', appointment);
    return response.data;
  }

  async updateAppointment(id: number, appointment: Partial<CreateAppointmentRequest>): Promise<Appointment> {
    const response: AxiosResponse<Appointment> = await this.api.patch(`/appointments/${id}`, appointment);
    return response.data;
  }

  async deleteAppointment(id: number): Promise<void> {
    await this.api.delete(`/appointments/${id}`);
  }

  async getQueue(doctorId?: number): Promise<QueueItem[]> {
    const params = doctorId ? { doctorId } : {};
    const response: AxiosResponse<QueueItem[]> = await this.api.get('/queue', { params });
    return response.data;
  }

  async getWaitingQueue(): Promise<QueueItem[]> {
    const response: AxiosResponse<QueueItem[]> = await this.api.get('/queue/waiting');
    return response.data;
  }

  async addToQueue(queueItem: CreateQueueRequest): Promise<QueueItem> {
    const response: AxiosResponse<QueueItem> = await this.api.post('/queue', queueItem);
    return response.data;
  }

  async updateQueueItem(id: number, queueItem: Partial<CreateQueueRequest>): Promise<QueueItem> {
    const response: AxiosResponse<QueueItem> = await this.api.patch(`/queue/${id}`, queueItem);
    return response.data;
  }

  async updateQueueStatus(id: number, status: 'waiting' | 'with-doctor' | 'completed' | 'canceled'): Promise<QueueItem> {
    const response: AxiosResponse<QueueItem> = await this.api.patch(`/queue/${id}/status`, { status });
    return response.data;
  }

  async callNextPatient(doctorId?: number): Promise<QueueItem | null> {
    const response: AxiosResponse<QueueItem | null> = await this.api.post('/queue/call-next', { doctorId });
    return response.data;
  }

  async completePatient(id: number): Promise<QueueItem> {
    const response: AxiosResponse<QueueItem> = await this.api.patch(`/queue/${id}/complete`);
    return response.data;
  }

  async removeFromQueue(id: number): Promise<void> {
    await this.api.delete(`/queue/${id}`);
  }
}

export const apiService = new ApiService();
export default apiService;
