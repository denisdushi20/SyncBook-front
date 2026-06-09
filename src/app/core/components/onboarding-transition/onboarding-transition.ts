import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

interface TransitionPhase {
  title: string;
  subtitle: string;
  nextRoute: string;
  durationMs: number;
}

const PHASES: Record<string, TransitionPhase> = {
  'account-verified': {
    title: 'Your account is verified',
    subtitle: "Let's set up your business",
    nextRoute: '/business-onboarding',
    durationMs: 2400
  },
  'business-ready': {
    title: 'Your business is set up',
    subtitle: 'Choose a plan to unlock your workspace',
    nextRoute: '/choose-plan',
    durationMs: 2400
  },
  'workspace-creating': {
    title: 'Payment successful',
    subtitle: 'Creating your workspace…',
    nextRoute: '/dashboard',
    durationMs: 2800
  }
};

@Component({
  selector: 'app-onboarding-transition',
  templateUrl: './onboarding-transition.html',
  styleUrl: './onboarding-transition.scss'
})
export class OnboardingTransitionComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  protected readonly title = signal('');
  protected readonly subtitle = signal('');
  protected readonly showSpinner = signal(true);

  ngOnInit(): void {
    const phase = this.route.snapshot.queryParamMap.get('phase') ?? '';
    const config = PHASES[phase];

    if (!config) {
      void this.router.navigate(['/']);
      return;
    }

    this.title.set(config.title);
    this.subtitle.set(config.subtitle);

    setTimeout(() => {
      void this.router.navigate([config.nextRoute]);
    }, config.durationMs);
  }
}
