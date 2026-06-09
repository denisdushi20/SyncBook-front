import { DatePipe } from '@angular/common';

import { Component, DestroyRef, effect, inject, signal } from '@angular/core';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { RouterLink } from '@angular/router';

import { filter } from 'rxjs';

import { NewBookingAlert } from '../../models/business.models';

import { AuthService } from '../../services/auth.service';

import { BookingAlertsHubService } from '../../services/booking-alerts-hub.service';

import { AppointmentService } from '../../../features/dashboard/services/appointment.service';



interface ChimeNote {

  frequency: number;

  delay: number;

  duration: number;

}



@Component({

  selector: 'app-booking-alerts-host',

  imports: [DatePipe, RouterLink],

  templateUrl: './booking-alerts-host.html',

  styleUrl: './booking-alerts-host.scss'

})

export class BookingAlertsHostComponent {

  private readonly bookingAlertsHub = inject(BookingAlertsHubService);

  private readonly authService = inject(AuthService);

  private readonly appointmentService = inject(AppointmentService);

  private readonly destroyRef = inject(DestroyRef);



  protected readonly activeToast = signal<NewBookingAlert | null>(null);

  protected readonly isOwner = signal(false);

  protected readonly isConfirming = signal(false);

  protected readonly isRejecting = signal(false);

  protected readonly actionError = signal<string | null>(null);



  private audioContext: AudioContext | null = null;

  private ringtoneInterval: ReturnType<typeof setInterval> | null = null;



  private readonly chimePattern: ChimeNote[] = [

    { frequency: 523.25, delay: 0, duration: 0.22 },

    { frequency: 659.25, delay: 0.28, duration: 0.22 },

    { frequency: 783.99, delay: 0.56, duration: 0.38 }

  ];



  constructor() {

    this.authService.currentUser$

      .pipe(takeUntilDestroyed(this.destroyRef))

      .subscribe((user) => {

        this.isOwner.set(user?.role === 'BusinessOwner');

        if (user?.role !== 'BusinessOwner') {

          this.dismissAlert();

        }

      });



    this.bookingAlertsHub.bookingToast$

      .pipe(

        filter(() => this.isOwner()),

        takeUntilDestroyed(this.destroyRef)

      )

      .subscribe((alert) => {
        this.activeToast.set(alert);

        this.actionError.set(null);

        this.startRingtone();

      });



    effect(() => {

      document.body.style.overflow = this.activeToast() ? 'hidden' : '';

    });



    this.destroyRef.onDestroy(() => {

      document.body.style.overflow = '';

      this.stopRingtone();

    });

  }



  protected dismissAlert(): void {

    this.activeToast.set(null);

    this.actionError.set(null);

    this.stopRingtone();

  }



  protected confirmBooking(): void {

    this.runAction('confirm');

  }



  protected rejectBooking(): void {

    this.runAction('reject');

  }



  private runAction(action: 'confirm' | 'reject'): void {

    const toast = this.activeToast();

    if (!toast?.appointmentId) {

      return;

    }



    const isConfirm = action === 'confirm';

    const busy = isConfirm ? this.isConfirming : this.isRejecting;

    busy.set(true);

    this.actionError.set(null);



    const request$ = isConfirm

      ? this.appointmentService.confirmAppointment(toast.appointmentId)

      : this.appointmentService.rejectAppointment(toast.appointmentId);



    request$.subscribe({

      next: () => {
        busy.set(false);

        this.dismissAlert();

      },

      error: (err) => {
        busy.set(false);

        this.actionError.set(

          err?.error?.message ??

            (isConfirm ? 'Failed to confirm booking.' : 'Failed to reject booking.')

        );

      }

    });

  }



  private startRingtone(): void {
    this.stopRingtone();



    try {

      this.audioContext = new AudioContext();

      void this.audioContext.resume();

      this.playChime();



      this.ringtoneInterval = setInterval(() => {

        this.playChime();

      }, 3200);

    } catch {

      // audio unavailable — overlay still shows

    }

  }



  private playChime(): void {

    if (!this.audioContext) {

      return;

    }



    const start = this.audioContext.currentTime;



    for (const note of this.chimePattern) {

      const oscillator = this.audioContext.createOscillator();

      const gain = this.audioContext.createGain();



      oscillator.type = 'triangle';

      oscillator.frequency.value = note.frequency;



      gain.gain.setValueAtTime(0.0001, start + note.delay);

      gain.gain.exponentialRampToValueAtTime(0.14, start + note.delay + 0.03);

      gain.gain.exponentialRampToValueAtTime(0.0001, start + note.delay + note.duration);



      oscillator.connect(gain);

      gain.connect(this.audioContext.destination);



      oscillator.start(start + note.delay);

      oscillator.stop(start + note.delay + note.duration + 0.05);

    }

  }



  private stopRingtone(): void {
    if (this.ringtoneInterval) {
      clearInterval(this.ringtoneInterval);
      this.ringtoneInterval = null;
    }

    if (this.audioContext) {
      void this.audioContext.close();
      this.audioContext = null;
    }
  }

}

