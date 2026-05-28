import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from '../../../app.config';

export interface Appointment {
  id: string;
  patientName: string;
  date: string;
  time: string;
  status: 'confirmed' | 'pending' | 'cancelled';
  clinica_nombre?: string;
  motivo?: string;
  cliente_telefono?: string;
  hora_hasta?: string;
}

export interface DashboardStats {
  totalAppointments: number;
  totalPatients: number;
  pendingAppointments: number;
  confirmedAppointments: number;
}

@Injectable({
  providedIn: 'root',
})
export class MedicalDashboardService {
  private statsSignal = signal<DashboardStats>({
    totalAppointments: 0,
    totalPatients: 0,
    pendingAppointments: 0,
    confirmedAppointments: 0,
  });
  public stats = this.statsSignal.asReadonly();

  private appointmentsSignal = signal<Appointment[]>([]);
  public appointments = this.appointmentsSignal.asReadonly();

  private loadingSignal = signal(false);
  public loading = this.loadingSignal.asReadonly();

  private errorSignal = signal(false);
  public error = this.errorSignal.asReadonly();

  constructor(private http: HttpClient) {}

  loadAppointments() {
    this.loadingSignal.set(true);
    this.errorSignal.set(false);

    const fd = new FormData();
    this.http.post(`${API_URL}pillaDoc/listar_citas_proveedor`, fd).subscribe({
      next: (res: any) => {
        this.loadingSignal.set(false);
        if (res?.status && Array.isArray(res.data)) {
          const citas: Appointment[] = res.data.map((c: any) => ({
            id: c.id,
            patientName: c.cliente_nombre || 'Paciente #' + c.cliente,
            date: c.fecha_formateada || c.fecha,
            time: c.hora_desde_form || c.hora_desde?.substring(0, 5),
            status: c.estado === 'confirmada' ? 'confirmed' :
                    c.estado === 'pendiente' ? 'pending' : 'cancelled',
            clinica_nombre: c.clinica_nombre,
            motivo: c.motivo,
            cliente_telefono: c.cliente_telefono,
            hora_hasta: c.hora_hasta_form || c.hora_hasta?.substring(0, 5),
          }));

          const stats: DashboardStats = {
            totalAppointments: citas.length,
            totalPatients: new Set(citas.map(c => c.patientName)).size,
            pendingAppointments: citas.filter(c => c.status === 'pending').length,
            confirmedAppointments: citas.filter(c => c.status === 'confirmed').length,
          };

          this.appointmentsSignal.set(citas);
          this.statsSignal.set(stats);
        } else {
          this.errorSignal.set(true);
        }
      },
      error: () => {
        this.loadingSignal.set(false);
        this.errorSignal.set(true);
      },
    });
  }
}
