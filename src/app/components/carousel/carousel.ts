import { Component, Input, ContentChildren, QueryList, AfterContentInit, ElementRef, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'ap-carousel',
  standalone: true,
  imports: [CommonModule, MatIconModule, MatButtonModule],
  template: `
    <div class="ap-carousel" #carouselContainer>
      <div class="ap-carousel__viewport" #viewport (scroll)="onScroll()">
        <div class="ap-carousel__track" #track>
          <ng-content></ng-content>
        </div>
      </div>

      <button class="ap-carousel__arrow ap-carousel__arrow--left" 
              (click)="prev()" 
              *ngIf="showArrows && canScrollLeft()"
              aria-label="Anterior">
        <mat-icon>chevron_left</mat-icon>
      </button>
      <button class="ap-carousel__arrow ap-carousel__arrow--right" 
              (click)="next()" 
              *ngIf="showArrows && canScrollRight()"
              aria-label="Siguiente">
        <mat-icon>chevron_right</mat-icon>
      </button>
    </div>

    <div class="ap-carousel__dots" *ngIf="showDots && slidesCount > 0">
      <button *ngFor="let _ of [].constructor(slidesCount); let i = index"
              class="ap-carousel__dot"
              [class.active]="i === currentIndex"
              (click)="goTo(i)"
              [attr.aria-label]="'Ir a slide ' + (i + 1)">
      </button>
    </div>
  `,
  styles: [`
    .ap-carousel { position: relative; }
    .ap-carousel__viewport { overflow-x: auto; scroll-snap-type: x mandatory; -webkit-overflow-scrolling: touch; scrollbar-width: none; }
    .ap-carousel__viewport::-webkit-scrollbar { display: none; }
    .ap-carousel__track { display: flex; gap: 1.5rem; }
    .ap-carousel__track ::ng-deep > * { flex: 0 0 auto; scroll-snap-align: start; }
    .ap-carousel__arrow { position: absolute; top: 50%; transform: translateY(-50%); z-index: 2; width: 40px; height: 40px; border-radius: 50%; border: none; background: rgba(255,255,255,.9); backdrop-filter: blur(8px); box-shadow: 0 4px 12px rgba(0,0,0,.1); cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all .2s; color: #0f172a; }
    .ap-carousel__arrow:hover { background: #fff; box-shadow: 0 6px 20px rgba(0,0,0,.15); transform: translateY(-50%) scale(1.05); }
    .ap-carousel__arrow--left { left: -20px; }
    .ap-carousel__arrow--right { right: -20px; }
    .ap-carousel__arrow mat-icon { font-size: 22px; width: 22px; height: 22px; }
    :host-context([data-theme="dark"]) .ap-carousel__arrow { background: rgba(11,19,41,.9); color: #f1f5f9; }
    .ap-carousel__dots { display: flex; justify-content: center; gap: 8px; margin-top: 1.5rem; }
    .ap-carousel__dot { width: 10px; height: 10px; border-radius: 50%; border: none; background: var(--border-color, #e2e8f0); cursor: pointer; transition: all .3s; padding: 0; }
    .ap-carousel__dot.active { background: #0A6E6E; width: 24px; border-radius: 5px; }
    :host-context([data-theme="dark"]) .ap-carousel__dot { background: rgba(255,255,255,.15); }
    :host-context([data-theme="dark"]) .ap-carousel__dot.active { background: #14b8b8; }
  `],
})
export class Carousel implements AfterContentInit, OnDestroy {
  @Input() showArrows = true;
  @Input() showDots = true;
  @Input() autoPlay = false;
  @Input() autoPlayInterval = 4000;

  slidesCount = 0;
  currentIndex = 0;
  canScrollLeft = signal(false);
  canScrollRight = signal(true);

  private autoPlayTimer: any;

  constructor(private el: ElementRef) {}

  ngAfterContentInit() {
    const viewport = this.el.nativeElement.querySelector('.ap-carousel__viewport');
    if (viewport) {
      viewport.addEventListener('scroll', () => this.onScroll());
      setTimeout(() => this.onScroll(), 100);
    }
    const track = this.el.nativeElement.querySelector('.ap-carousel__track');
    if (track) {
      this.slidesCount = track.children.length;
    }
    if (this.autoPlay) this.startAutoPlay();
  }

  ngOnDestroy() {
    this.stopAutoPlay();
  }

  onScroll() {
    const viewport = this.el.nativeElement.querySelector('.ap-carousel__viewport');
    if (!viewport) return;
    const maxScroll = viewport.scrollWidth - viewport.clientWidth;
    this.canScrollLeft.set(viewport.scrollLeft > 10);
    this.canScrollRight.set(viewport.scrollLeft < maxScroll - 10);
    const slideWidth = viewport.clientWidth;
    this.currentIndex = Math.round(viewport.scrollLeft / slideWidth);
  }

  prev() {
    const viewport = this.el.nativeElement.querySelector('.ap-carousel__viewport');
    if (!viewport) return;
    const slideWidth = viewport.clientWidth;
    viewport.scrollBy({ left: -slideWidth, behavior: 'smooth' });
  }

  next() {
    const viewport = this.el.nativeElement.querySelector('.ap-carousel__viewport');
    if (!viewport) return;
    const slideWidth = viewport.clientWidth;
    viewport.scrollBy({ left: slideWidth, behavior: 'smooth' });
  }

  goTo(index: number) {
    const viewport = this.el.nativeElement.querySelector('.ap-carousel__viewport');
    if (!viewport) return;
    const slideWidth = viewport.clientWidth;
    viewport.scrollTo({ left: slideWidth * index, behavior: 'smooth' });
  }

  private startAutoPlay() {
    this.autoPlayTimer = setInterval(() => {
      if (!this.canScrollRight()) {
        this.goTo(0);
      } else {
        this.next();
      }
    }, this.autoPlayInterval);
  }

  private stopAutoPlay() {
    if (this.autoPlayTimer) clearInterval(this.autoPlayTimer);
  }
}
