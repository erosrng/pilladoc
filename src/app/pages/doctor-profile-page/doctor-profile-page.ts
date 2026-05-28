import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { API_URL } from '../../app.config';
import { AuthService } from '../../auth.service';
import Swal from 'sweetalert2';

interface TimeSlot { desde: string; hasta: string; }
interface DiaHorario { dia: number; slots: TimeSlot[]; }
interface Clinica { id: string; nombre: string; horarios: DiaHorario[]; }
interface Redes { instagram: string; whatsapp: string; website: string; youtube: string; tiktok: string; }

interface DoctorProfile {
  proveed: string;
  nombre: string;
  rif: string;
  email: string;
  telefono: string;
  ciudad: string;
  estado: string;
  especialidad: string;
  foto: string | null;
  foto_filename: string | null;
  banner: string | null;
  banner_filename: string | null;
  about: string;
  clinicas: Clinica[];
  horarios: DiaHorario[];
  redes: Redes;
  color_theme: string;
  telefono_publico: string | null;
  website: string | null;
}

@Component({
  selector: 'app-doctor-profile-page',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './doctor-profile-page.html',
  styleUrl: './doctor-profile-page.scss',
})
export class DoctorProfilePage implements OnInit {
  profile = signal<DoctorProfile | null>(null);
  isLoading = signal(true);
  notFound = signal(false);
  slug = '';

  diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  defaultBanner = 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200';
  defaultAvatar = 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=200';

  // Booking
  authService = inject(AuthService);
  fechaCita = signal('');
  slotsDisponibles = signal<any[]>([]);
  slotSeleccionado = signal<any>(null);
  motivoCita = signal('');
  cargandoSlots = signal(false);
  reservando = signal(false);
  minDate = new Date().toISOString().split('T')[0];

  constructor(
    private route: ActivatedRoute,
    private http: HttpClient,
  ) {}

  // ────── Booking ──────

  cargarSlots() {
    const prof = this.profile();
    const fecha = this.fechaCita();
    if (!prof || !fecha) return;

    this.cargandoSlots.set(true);
    this.slotSeleccionado.set(null);
    this.slotsDisponibles.set([]);

    const fd = new FormData();
    fd.append('proveed', prof.proveed);
    fd.append('fecha', fecha);

    this.http.post(`${API_URL}pillaDoc/listar_slots_disponibles`, fd).subscribe({
      next: (res: any) => {
        this.cargandoSlots.set(false);
        if (res?.status) {
          this.slotsDisponibles.set(res.data || []);
        }
      },
      error: () => {
        this.cargandoSlots.set(false);
      },
    });
  }

  seleccionarSlot(slot: any) {
    this.slotSeleccionado.set(slot);
  }

  agendarCita() {
    const prof = this.profile();
    const slot = this.slotSeleccionado();
    if (!prof || !slot) return;

    this.reservando.set(true);
    const fd = new FormData();
    fd.append('proveed', prof.proveed);
    fd.append('fecha', this.fechaCita());
    fd.append('hora_desde', slot.hora_desde);
    fd.append('hora_hasta', slot.hora_hasta || '');
    fd.append('clinica_nombre', slot.clinica_nombre || '');
    fd.append('motivo', this.motivoCita());

    this.http.post(`${API_URL}pillaDoc/agendar_cita`, fd).subscribe({
      next: (res: any) => {
        this.reservando.set(false);
        if (res?.status) {
          Swal.fire({
            icon: 'success',
            title: 'Cita agendada',
            text: 'Tu cita ha sido registrada. El doctor la confirmar&aacute; pronto.',
            confirmButtonColor: '#0A6E6E',
          });
          this.fechaCita.set('');
          this.slotsDisponibles.set([]);
          this.slotSeleccionado.set(null);
          this.motivoCita.set('');
        } else {
          Swal.fire({ icon: 'error', title: 'Error', text: res?.message || 'No se pudo agendar', confirmButtonColor: '#0A6E6E' });
        }
      },
      error: () => {
        this.reservando.set(false);
        Swal.fire({ icon: 'error', title: 'Error de conexi&oacute;n', confirmButtonColor: '#0A6E6E' });
      },
    });
  }

  ngOnInit() {
    this.route.paramMap.subscribe(params => {
      this.slug = params.get('slug') || '';
      this.loadProfile();
    });
  }

  loadProfile() {
    this.isLoading.set(true);
    this.notFound.set(false);
    const body = { proveed: this.slug, slug: this.slug };
    this.http.post(`${API_URL}perfil_publico`, body).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        if (res?.status && res?.data) {
          const d = res.data.doctor || {};
          const p = res.data.profile || {};
          this.profile.set({
            proveed: d.proveed || '',
            nombre: d.nombre || '',
            rif: d.rif || '',
            email: d.email || '',
            telefono: d.telefono || d.telefono_publico || '',
            ciudad: d.ciudad || '',
            estado: d.estado || '',
            especialidad: p.especialidad || d.especialidad || '',
            foto: p.foto || null,
            foto_filename: p.foto_filename || null,
            banner: p.banner || null,
            banner_filename: p.banner_filename || null,
            about: p.about || '',
            clinicas: this.combinarClinicas(p.clinicas || [], p.horarios || []),
            horarios: p.horarios || [],
            redes: this.normalizarRedes(p.redes, p.website),
            color_theme: p.color_theme || '#0A6E6E',
            telefono_publico: p.telefono_publico || null,
            website: p.website || null,
          });
        } else {
          this.notFound.set(true);
        }
      },
      error: () => {
        this.isLoading.set(false);
        this.notFound.set(true);
      },
    });
  }

  private normalizarRedes(redes: any, website?: string): Redes {
    const base: Redes = { instagram: '', whatsapp: '', website: '', youtube: '', tiktok: '' };
    if (redes && typeof redes === 'object') Object.assign(base, redes);
    if (website && !base.website) base.website = website;
    return base;
  }

  private combinarClinicas(clinicasApi: any[], horariosApi: any[]): Clinica[] {
    if (!clinicasApi.length && !horariosApi.length) return [];

    return clinicasApi.map((cl: any) => {
      const id = cl.id || cl.nombre?.toLowerCase().replace(/\s+/g, '-');
      const related = horariosApi.filter((h: any) =>
        h.clinica_id === id || h.clinica_id === cl.id
      );
      return {
        id: id || `c${Date.now()}`,
        nombre: cl.nombre || '',
        horarios: related.length
          ? related.map((h: any) => ({
              dia: h.dia ?? 0,
              slots: (h.slots || []).sort((a: any, b: any) => a.desde.localeCompare(b.desde)),
            })).sort((a, b) => a.dia - b.dia)
          : [],
      };
    });
  }

  getInitiales(nombre: string): string {
    return nombre
      .split(' ')
      .map(p => p[0])
      .join('')
      .substring(0, 2)
      .toUpperCase();
  }

  hasRedes(): boolean {
    const p = this.profile();
    if (!p) return false;
    const r = p.redes;
    return !!(r.instagram || r.whatsapp || r.website || r.youtube || r.tiktok);
  }

  trackClinica(_: number, item: Clinica) { return item.id; }
}
