import {
  AfterViewInit,
  Component,
  ElementRef,
  forwardRef,
  signal,
  viewChild
} from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-otp-input',
  template: `
    <div class="otp-input" #host (paste)="onPaste($event)">
      @for (index of slots; track index) {
        <input
          class="otp-digit"
          type="text"
          inputmode="numeric"
          maxlength="1"
          [value]="digits()[index]"
          (input)="onDigitInput(index, $event)"
          (keydown)="onKeyDown(index, $event)"
        />
      }
    </div>
  `,
  styles: `
    .otp-input {
      display: flex;
      gap: 0.6rem;
      justify-content: center;
    }

    .otp-digit {
      width: 2.75rem;
      height: 3.25rem;
      border: 1px solid #cbd5e1;
      border-radius: 10px;
      text-align: center;
      font-size: 1.35rem;
      font-weight: 700;
      color: #0f766e;
      box-sizing: border-box;
    }

    .otp-digit:focus {
      outline: none;
      border-color: #10b981;
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.15);
    }
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => OtpInputComponent),
      multi: true
    }
  ]
})
export class OtpInputComponent implements ControlValueAccessor, AfterViewInit {
  private readonly host = viewChild.required<ElementRef<HTMLElement>>('host');

  protected readonly slots = [0, 1, 2, 3, 4, 5];
  protected readonly digits = signal<string[]>(['', '', '', '', '', '']);

  private onChange: (value: string) => void = () => undefined;
  private onTouchedCallback: () => void = () => undefined;
  private disabled = false;

  ngAfterViewInit(): void {
    if (this.disabled) {
      this.getInputs().forEach((input) => {
        input.disabled = true;
      });
    }
  }

  writeValue(value: string | null): void {
    const normalized = (value ?? '').replace(/\D/g, '').slice(0, 6);
    this.digits.set([
      normalized[0] ?? '',
      normalized[1] ?? '',
      normalized[2] ?? '',
      normalized[3] ?? '',
      normalized[4] ?? '',
      normalized[5] ?? ''
    ]);
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchedCallback = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
    this.getInputs().forEach((input) => {
      input.disabled = isDisabled;
    });
  }

  protected onDigitInput(index: number, event: Event): void {
    const input = event.target as HTMLInputElement;
    const digit = input.value.replace(/\D/g, '').slice(-1);
    input.value = digit;

    const next = [...this.digits()];
    next[index] = digit;
    this.digits.set(next);
    this.emitValue(next);

    if (digit && index < 5) {
      this.getInputs()[index + 1]?.focus();
    }
  }

  protected onKeyDown(index: number, event: KeyboardEvent): void {
    if (event.key === 'Backspace' && !this.digits()[index] && index > 0) {
      this.getInputs()[index - 1]?.focus();
    }
  }

  protected onPaste(event: ClipboardEvent): void {
    event.preventDefault();
    const pasted = event.clipboardData?.getData('text') ?? '';
    const normalized = pasted.replace(/\D/g, '').slice(0, 6);
    this.writeValue(normalized);
    this.emitValue(this.digits());
    this.onTouchedCallback();
    this.getInputs()[Math.min(normalized.length, 5)]?.focus();
  }

  private emitValue(digits: string[]): void {
    this.onChange(digits.join(''));
    this.onTouchedCallback();
  }

  private getInputs(): HTMLInputElement[] {
    return Array.from(this.host().nativeElement.querySelectorAll('.otp-digit'));
  }
}
