import { Component, OnInit, signal, computed, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../auth.service';
import { MedicalDashboardService } from './services/medical-dashboard';
import { API_URL } from '../../app.config';
import Swal from 'sweetalert2';

interface TimeSlot { desde: string; hasta: string; }
interface DiaHorario { dia: number; slots: TimeSlot[]; }
interface Clinica { id: string; nombre: string; horarios: DiaHorario[]; }
interface RedesSociales { instagram: string; whatsapp: string; website: string; youtube: string; tiktok: string; }

@Component({
  selector: 'app-dashboardprv',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule,
    MatButtonModule, MatIconModule, MatCardModule, MatProgressSpinnerModule,
  ],
  templateUrl: './dashboardprv.html',
  styleUrl: './dashboardprv.scss',
})
export class DashboardprvPage implements OnInit {
  activeTab = signal<'dashboard' | 'profile'>('dashboard');

  profileNombre = signal('');
  profileCorreo = signal('');
  profileTelefono = signal('');
  profileEspecialidad = signal('');
  profileBio = signal('');
  profileFoto = signal<string | null>(null);

  profileRedes = signal<RedesSociales>({ instagram: '', whatsapp: '', website: '', youtube: '', tiktok: '' });
  clinicas = signal<Clinica[]>([]);

  diasSemana = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  prefijosTel = ['0412', '0414', '0416', '0424', '0426', '0212', '0241', '0261', '0271', '0281', '0291'];
  phonePrefix = signal('0414');

  loadingProfile = signal(false);
  savingProfile = signal(false);
  profileError = signal(false);

  clinicasSorted = computed(() => {
    return this.clinicas().map(cl => ({
      ...cl,
      horarios: [...cl.horarios]
        .sort((a, b) => a.dia - b.dia)
        .map(h => ({ ...h, slots: [...h.slots].sort((a, b) => a.desde.localeCompare(b.desde)) })),
    }));
  });

  private platformId = inject(PLATFORM_ID);
  private http = inject(HttpClient);

  constructor(
    public authService: AuthService,
    public dashboardService: MedicalDashboardService,
  ) {}

  ngOnInit() {
    this.dashboardService.loadSampleData();
    this.cargarPerfil();
  }

  cargarPerfil() {
    this.loadingProfile.set(true);
    this.profileError.set(false);
    this.http.get(`${API_URL}pillaDoc/obtener_perfil`).subscribe({
      next: (res: any) => {
        this.loadingProfile.set(false);
        if (res?.status && res?.data) {
          const d = res.data.doctor || {};
          const p = res.data.profile || {};
          this.profileNombre.set(d.nombre || '');
          this.profileCorreo.set(d.email || '');
          const tel = d.telefono || '';
          this.profileTelefono.set(tel);
          this.parsePhone(tel);
          this.profileEspecialidad.set(p.especialidad || d.especialidad || '');
          this.profileBio.set(p.about || '');
          this.profileFoto.set(p.foto || null);
          const redesObj = { ...this.profileRedes() };
          if (p.redes) Object.assign(redesObj, p.redes);
          if (p.website && !redesObj.website) redesObj.website = p.website;
          this.profileRedes.set(redesObj);
          if (Array.isArray(p.clinicas) || Array.isArray(p.horarios)) {
            this.combinarClinicasHorarios(p.clinicas || [], p.horarios || []);
          }
        } else {
          this.profileError.set(true);
        }
      },
      error: () => {
        this.loadingProfile.set(false);
        this.profileError.set(true);
      },
    });
  }

  private parsePhone(telefono: string) {
    if (!telefono) return;
    let clean = telefono.replace(/\s+/g, '');
    if (clean.startsWith('+58')) clean = clean.substring(3);
    else if (clean.startsWith('0058')) clean = clean.substring(4);
    for (const p of this.prefijosTel) {
      if (clean.startsWith(p)) {
        this.phonePrefix.set(p);
        this.profileTelefono.set(clean.substring(p.length));
        return;
      }
    }
  }

  private combinarClinicasHorarios(clinicasApi: any[], horariosApi: any[]) {
    if (!clinicasApi.length && !horariosApi.length) return;

    if (clinicasApi.length && horariosApi.length) {
      const clinics = clinicasApi.map((cl: any) => {
        const id = cl.id || cl.nombre?.toLowerCase().replace(/\s+/g, '-');
        const related = horariosApi.filter((h: any) => h.clinica_id === id || h.clinica_id === cl.id);
        return {
          id: id || `c${Date.now()}-${Math.random()}`,
          nombre: cl.nombre || '',
          horarios: related.length
            ? related.map((h: any) => ({ dia: h.dia ?? 0, slots: h.slots || [] }))
            : [],
        };
      });
      this.clinicas.set(clinics);
    } else {
      const c = clinicasApi.length
        ? clinicasApi.map((cl: any, i: number) => ({
            id: cl.id || `c${i}`,
            nombre: cl.nombre || '',
            horarios: [],
          }))
        : horariosApi
            .filter((h: any) => h.clinica_id)
            .reduce((acc: any[], h: any) => {
              if (!acc.find((a: any) => a.id === h.clinica_id)) {
                acc.push({
                  id: h.clinica_id,
                  nombre: h.clinica_nombre || '',
                  horarios: [],
                });
              }
              return acc;
            }, []);
      this.clinicas.set(c);
    }
  }

  onFotoSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('foto', file);
    this.http.post(`${API_URL}pillaDoc/subir_foto_perfil`, fd).subscribe({
      next: (res: any) => {
        if (res?.status && res?.foto_url) {
          this.profileFoto.set(res.foto_url);
        }
      },
    });
  }

  actualizarRed(key: keyof RedesSociales, value: string) {
    this.profileRedes.update(r => ({ ...r, [key]: value }));
  }

  agregarClinica() {
    const id = isPlatformBrowser(this.platformId) ? crypto.randomUUID() : `${Date.now()}`;
    this.clinicas.update(c => [...c, { id, nombre: '', horarios: [] }]);
  }

  eliminarClinica(id: string) {
    this.clinicas.update(c => c.filter(cl => cl.id !== id));
  }

  actualizarClinicaNombre(id: string, nombre: string) {
    this.clinicas.update(c => c.map(cl => (cl.id === id ? { ...cl, nombre } : cl)));
  }

  toggleDia(clinicaId: string, dia: number) {
    this.clinicas.update(c =>
      c.map(cl => {
        if (cl.id !== clinicaId) return cl;
        const exists = cl.horarios.find(h => h.dia === dia);
        if (exists) return { ...cl, horarios: cl.horarios.filter(h => h.dia !== dia) };
        return { ...cl, horarios: [...cl.horarios, { dia, slots: [{ desde: '08:00', hasta: '12:00' }] }] };
      })
    );
  }

  tieneDia(clinicaId: string, dia: number): boolean {
    return !!this.clinicas().find(c => c.id === clinicaId)?.horarios.find(h => h.dia === dia);
  }

  agregarSlot(clinicaId: string, dia: number) {
    this.clinicas.update(c =>
      c.map(cl => ({
        ...cl,
        horarios: cl.horarios.map(h =>
          h.dia === dia ? { ...h, slots: [...h.slots, { desde: '14:00', hasta: '17:00' }] } : h
        ),
      }))
    );
  }

  eliminarSlot(clinicaId: string, dia: number, idx: number) {
    this.clinicas.update(c =>
      c.map(cl => ({
        ...cl,
        horarios: cl.horarios.map(h =>
          h.dia === dia ? { ...h, slots: h.slots.filter((_, i) => i !== idx) } : h
        ),
      }))
    );
  }

  actualizarSlot(clinicaId: string, dia: number, idx: number, field: 'desde' | 'hasta', value: string) {
    this.clinicas.update(c =>
      c.map(cl => ({
        ...cl,
        horarios: cl.horarios.map(h =>
          h.dia === dia
            ? { ...h, slots: h.slots.map((s, i) => (i === idx ? { ...s, [field]: value } : s)) }
            : h
        ),
      }))
    );
  }

  trackClinica(_: number, item: Clinica) { return item.id; }

  guardarPerfil() {
    this.savingProfile.set(true);
    const clinicas = this.clinicas().map(cl => ({ id: cl.id, nombre: cl.nombre }));
    const horarios = this.clinicas().flatMap(cl =>
      cl.horarios.map(h => ({ clinica_id: cl.id, dia: h.dia, slots: h.slots }))
    );
    const r = this.profileRedes();
    const data = {
      nombre: this.profileNombre(),
      email: this.profileCorreo(),
      telefono: this.phonePrefix() + this.profileTelefono(),
      about: this.profileBio(),
      especialidad: this.profileEspecialidad(),
      website: r.website || '',
      redes: r,
      clinicas,
      horarios,
    };

    this.http.post(`${API_URL}pillaDoc/guardar_perfil`, data).subscribe({
      next: (res: any) => {
        this.savingProfile.set(false);
        if (res?.status) {
          Swal.fire({ icon: 'success', title: 'Perfil actualizado', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
        } else {
          Swal.fire({ icon: 'error', title: 'Error', text: res?.message || 'No se pudo guardar', confirmButtonColor: '#0A6E6E' });
        }
      },
      error: () => {
        this.savingProfile.set(false);
        Swal.fire({ icon: 'error', title: 'Error de conexión', text: 'Verifica tu conexión e intenta de nuevo', confirmButtonColor: '#0A6E6E' });
      },
    });
  }

  logout() { this.authService.logout(); }
}
