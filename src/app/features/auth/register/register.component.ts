import { Component, signal, OnInit, OnDestroy, inject, PLATFORM_ID } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import Swal from 'sweetalert2';
import { API_URL } from '../../../app.config';

interface Estado { codigo: string; entidad: string; }
interface Municipio { id: string; nombre: string; }
interface Especialidad { grupo: string; gr_desc: string; }

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './register.component.html',
  styleUrl: './register.component.scss',
})
export class RegisterComponent implements OnInit, OnDestroy {
  tipo = signal<string>('M');
  idType = signal<string>('V');
  rif = signal('');
  name = signal('');
  email = signal('');
  phonePrefix = signal('0414');
  phoneNumber = signal('');

  password = signal('');
  confirmPassword = signal('');
  hidePassword = signal(true);
  isLoading = signal(false);
  errorMessage = signal('');

  estados = signal<Estado[]>([]);
  municipios = signal<Municipio[]>([]);
  especialidades = signal<Especialidad[]>([]);

  selectedEstado = signal<string>('');
  selectedMunicipio = signal<string>('');
  selectedEspecialidad = signal<string>('');
  ciudad = signal('');

  estadoOpen = signal(false);
  municipioOpen = signal(false);
  especialidadOpen = signal(false);

  tipoDocumento = ['V', 'J', 'G', 'E', 'P'];
  prefijos = ['0412', '0414', '0416', '0424', '0426', '0212', '0241', '0261', '0271', '0281', '0291'];
  emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;

  get selectedEstadoName() {
    const e = this.estados().find(e => e.codigo === this.selectedEstado());
    return e?.entidad || '';
  }

  get selectedMunicipioName() {
    const m = this.municipios().find(m => m.id === this.selectedMunicipio());
    return m?.nombre || this.selectedMunicipio() || '';
  }

  get emailValido() {
    return !this.email() || this.emailRegex.test(this.email());
  }

  get selectedEspecialidadLabel() {
    const g = this.selectedEspecialidad();
    if (!g) return '';
    const s = this.especialidades().find(s => s.grupo === g);
    return s?.gr_desc || '';
  }

  private platformId = inject(PLATFORM_ID);
  private clickHandler: any;

  constructor(
    private router: Router,
    private http: HttpClient,
  ) {}

  ngOnInit() {
    this.loadEstados();
    this.loadEspecialidades();

    if (isPlatformBrowser(this.platformId)) {
      this.clickHandler = (e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (!target.closest('.ap-aniselect')) {
          this.estadoOpen.set(false);
          this.municipioOpen.set(false);
          this.especialidadOpen.set(false);
        }
      };
      document.addEventListener('click', this.clickHandler);
    }
  }

  ngOnDestroy() {
    if (this.clickHandler) document.removeEventListener('click', this.clickHandler);
  }

  loadEstados() {
    this.http.post(`${API_URL}estados`, {}).subscribe({
      next: (res: any) => { if (res.status) this.estados.set(res.data || []); },
    });
  }

  loadEspecialidades() {
    this.http.post(`${API_URL}buscagrupoprv`, {}).subscribe({
      next: (res: any) => { if (res.status) this.especialidades.set(res.data || []); },
    });
  }

  onEstadoChange(codigo: string) {
    this.selectedEstado.set(codigo);
    this.selectedMunicipio.set('');
    this.municipios.set([]);
    this.estadoOpen.set(false);
    this.municipioOpen.set(true);
    if (codigo) {
      const fd = new FormData();
      fd.append('estado_id', codigo);
      this.http.post(`${API_URL}municipios`, fd).subscribe({
        next: (res: any) => { if (res.status) this.municipios.set(res.data || []); },
      });
    }
  }

  selectEspecialidad(grupo: string) {
    this.selectedEspecialidad.set(grupo);
    this.especialidadOpen.set(false);
  }

  async onRegister() {
    const pass = this.password();
    const confirm = this.confirmPassword();
    if (pass !== confirm) {
      await Swal.fire({ icon: 'error', title: 'Error', text: 'Las contraseñas no coinciden', confirmButtonColor: '#0A6E6E' });
      return;
    }
    if (pass.length < 6) {
      await Swal.fire({ icon: 'warning', title: 'Seguridad', text: 'La contraseña debe tener al menos 6 caracteres', confirmButtonColor: '#0A6E6E' });
      return;
    }
    this.isLoading.set(true);
    const formData = new FormData();
    formData.append('idType', this.idType());
    formData.append('rif', this.rif());
    formData.append('nombre', this.name());
    formData.append('email', this.email());
    formData.append('phonePrefix', this.phonePrefix());
    formData.append('phoneNumber', this.phoneNumber());
    formData.append('password', pass);
    formData.append('tipo', this.tipo());
    formData.append('estado', this.selectedEstado());
    formData.append('ciudad', this.ciudad());
    formData.append('grupo', this.selectedEspecialidad());

    this.http.post(`${API_URL}guardar_proveedor`, formData).subscribe({
      next: (res: any) => {
        this.isLoading.set(false);
        if (res.success) {
          Swal.fire({
            title: '¡Registro Exitoso!',
            text: 'Hemos enviado un correo para validar tu cuenta.',
            icon: 'success',
            confirmButtonColor: '#0A6E6E',
          }).then(() => this.router.navigate(['/auth/login']));
        } else {
          Swal.fire({ icon: 'error', title: 'Error', text: res.error || 'Error al registrar', confirmButtonColor: '#0A6E6E' });
        }
      },
      error: () => {
        this.isLoading.set(false);
        Swal.fire({ icon: 'error', title: 'Error de Red', text: 'No se pudo conectar con el servidor', confirmButtonColor: '#0A6E6E' });
      },
    });
  }
}
