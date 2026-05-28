import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../auth.service';
import { API_URL } from '../../app.config';
import Swal from 'sweetalert2';

@Component({
  selector: 'app-cuenta',
  standalone: true,
  imports: [
    CommonModule, RouterModule, FormsModule,
    MatButtonModule, MatIconModule, MatCardModule, MatProgressSpinnerModule,
  ],
  templateUrl: './cuenta.html',
  styleUrl: './cuenta.scss',
})
export class CuentaPage implements OnInit {
  activeTab = signal<'perfil' | 'citas'>('perfil');

  // Perfil
  perfil = signal<any>(null);
  loadingProfile = false;
  savingProfile = signal(false);
  profileError = signal(false);
  errorMessage = signal<string | null>(null);

  editNombre = signal('');
  editCorreo = signal('');
  editTelefono = signal('');
  editRif = signal('');
  phonePrefix = signal('0414');
  prefijosTel = ['0412', '0414', '0416', '0424', '0426', '0212', '0241', '0261', '0271', '0281', '0291'];

  emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

  get emailValido() {
    return !this.editCorreo() || this.emailRegex.test(this.editCorreo());
  }

  // Citas
  citas = signal<any[]>([]);
  loadingCitas = signal(false);
  citasError = signal(false);
  citasLoaded = false;
  cancelandoId = signal<number | null>(null);

  hoy = new Date();

  proximas = computed(() =>
    this.citas().filter(c =>
      c.estado !== 'cancelada' && c.estado !== 'completada' &&
      (c.fecha > this.hoy.toISOString().split('T')[0] ||
       (c.fecha === this.hoy.toISOString().split('T')[0] && c.hora_desde >= this.hoy.toTimeString().slice(0, 8)))
    )
  );

  historial = computed(() =>
    this.citas().filter(c =>
      c.estado === 'cancelada' || c.estado === 'completada' ||
      c.fecha < this.hoy.toISOString().split('T')[0] ||
      (c.fecha === this.hoy.toISOString().split('T')[0] && c.hora_desde < this.hoy.toTimeString().slice(0, 8))
    )
  );

  constructor(
    public authService: AuthService,
    private http: HttpClient,
  ) {}

  ngOnInit() {
    this.cargarPerfil();
  }

  onTabChange(tab: 'perfil' | 'citas') {
    this.activeTab.set(tab);
    if (tab === 'citas' && !this.citasLoaded) {
      this.cargarCitas();
    }
  }

  // ────── Perfil ──────

  cargarPerfil() {
    this.loadingProfile = true;
    this.profileError.set(false);
    this.errorMessage.set(null);
    const fd = new FormData();
    this.http.post(`${API_URL}pillaDoc/obtener_perfil_cliente`, fd).subscribe({
      next: (res: any) => {
        this.loadingProfile = false;
        if (res?.status==true) {
          this.perfil.set(res.data);
          const p = res.data;
          this.editNombre.set(p.nombre || '');
          this.editCorreo.set(p.email || '');
          this.editTelefono.set(p.telefono || '');
          this.editRif.set(p.rifci || '');
          this.parsePhone(p.telefono || '');
        } else {
          this.profileError.set(true);
          this.errorMessage.set(res?.message || res?.error || 'Respuesta inesperada del servidor');
          console.warn('[cuenta] perfil error:', res);
        }
      },
      error: (err) => {
        this.loadingProfile = false;
        this.profileError.set(true);
        this.errorMessage.set('Error de conexión al cargar perfil');
        console.error('[cuenta] perfil error:', err);
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
        this.editTelefono.set(clean.substring(p.length));
        return;
      }
    }
  }

  onFotoSelected(event: any) {
    const file = event.target.files?.[0];
    if (!file) return;
    const fd = new FormData();
    fd.append('foto', file);
    this.http.post(`${API_URL}pillaDoc/subir_foto_cliente`, fd).subscribe({
      next: (res: any) => {
        if (res?.status && res?.foto_url) {
          this.perfil.update((p: any) => ({ ...p, foto: res.foto_url, foto_filename: res.foto_filename }));
        }
      },
    });
  }

  guardarPerfil() {
    if (!this.emailValido) {
      Swal.fire({ icon: 'error', title: 'Correo inválido', text: 'Verifica el formato del correo electrónico', confirmButtonColor: '#0A6E6E' });
      return;
    }

    this.savingProfile.set(true);
    const data: any = {};

    if (this.editNombre()) data.nombre = this.editNombre();
    if (this.editCorreo()) data.email = this.editCorreo();
    if (this.editTelefono()) data.telefono = this.phonePrefix() + this.editTelefono();
    if (this.editRif()) data.rif = this.editRif();

    this.http.post(`${API_URL}pillaDoc/guardar_perfil_cliente`, data).subscribe({
      next: (res: any) => {
        this.savingProfile.set(false);
        if (res?.status) {
          this.perfil.update((p: any) => ({
            ...p,
            nombre: this.editNombre(),
            email: this.editCorreo(),
            telefono: this.phonePrefix() + this.editTelefono(),
            rifci: this.editRif(),
          }));
          Swal.fire({ icon: 'success', title: 'Perfil actualizado', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
        } else {
          Swal.fire({ icon: 'error', title: 'Error', text: res?.error || 'No se pudo guardar', confirmButtonColor: '#0A6E6E' });
        }
      },
      error: () => {
        this.savingProfile.set(false);
        Swal.fire({ icon: 'error', title: 'Error de conexión', text: 'Verifica tu conexión e intenta de nuevo', confirmButtonColor: '#0A6E6E' });
      },
    });
  }

  // ────── Citas ──────

  cargarCitas() {
    this.loadingCitas.set(true);
    this.citasError.set(false);
    this.citasLoaded = true;
    const fd = new FormData();
    this.http.post(`${API_URL}pillaDoc/listar_citas_cliente`, fd).subscribe({
      next: (res: any) => {
        this.loadingCitas.set(false);
        if (res.status==true) {
          this.citas.set(res.data);
        } else {
          this.citasError.set(true);
          console.warn('[cuenta] citas error:', res);
        }
      },
      error: (err) => {
        this.loadingCitas.set(false);
        this.citasError.set(true);
        console.error('[cuenta] citas error:', err);
      },
    });
  }

  cancelarCita(id: number) {
    Swal.fire({
      title: '¿Cancelar cita?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#64748b',
      confirmButtonText: 'Sí, cancelar',
      cancelButtonText: 'Volver',
    }).then(result => {
      if (!result.isConfirmed) return;

      this.cancelandoId.set(id);
      const fd = new FormData();
      fd.append('id', String(id));
      this.http.post(`${API_URL}pillaDoc/cancelar_cita`, fd).subscribe({
        next: (res: any) => {
          this.cancelandoId.set(null);
          if (res?.status) {
            this.citas.update(c => c.map(ci => ci.id === id ? { ...ci, estado: 'cancelada' } : ci));
            Swal.fire({ icon: 'success', title: 'Cita cancelada', timer: 1500, showConfirmButton: false, toast: true, position: 'top-end' });
          } else {
            Swal.fire({ icon: 'error', title: 'Error', text: res?.message || 'No se pudo cancelar', confirmButtonColor: '#0A6E6E' });
          }
        },
        error: () => {
          this.cancelandoId.set(null);
          Swal.fire({ icon: 'error', title: 'Error de conexión', confirmButtonColor: '#0A6E6E' });
        },
      });
    });
  }

  logout() {
    this.authService.logout();
  }
}
