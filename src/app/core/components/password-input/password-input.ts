import { Component, forwardRef, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-password-input',
  template: `
    <div class="password-input">
      <input
        [id]="inputId()"
        [type]="visible() ? 'text' : 'password'"
        [placeholder]="placeholder()"
        [disabled]="disabled"
        [value]="value"
        (input)="onInput($event)"
        (blur)="onTouched()"
      />
      <button type="button" class="toggle-btn" (click)="toggleVisibility()" [attr.aria-label]="visible() ? 'Hide password' : 'Show password'">
        {{ visible() ? 'Hide' : 'Show' }}
      </button>
    </div>
  `,
  styles: `
    .password-input {
      position: relative;
      display: flex;
      align-items: center;
    }

    input {
      width: 100%;
      padding: 0.65rem 4.5rem 0.65rem 0.85rem;
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      font-size: 1rem;
      box-sizing: border-box;
      transition: border-color 0.2s;
    }

    input:focus {
      outline: none;
      border-color: #10b981;
    }

    input:disabled {
      background: #f8fafc;
      cursor: not-allowed;
    }

    .toggle-btn {
      position: absolute;
      right: 0.5rem;
      border: none;
      background: transparent;
      color: #64748b;
      font-size: 0.8rem;
      font-weight: 600;
      cursor: pointer;
      padding: 0.25rem 0.5rem;
    }

    .toggle-btn:hover {
      color: #0f766e;
    }
  `,
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => PasswordInputComponent),
      multi: true
    }
  ]
})
export class PasswordInputComponent implements ControlValueAccessor {
  readonly inputId = input('password');
  readonly placeholder = input('');

  protected readonly visible = signal(false);
  protected value = '';
  protected disabled = false;

  private onChange: (value: string) => void = () => undefined;
  private onTouchedCallback: () => void = () => undefined;

  writeValue(value: string | null): void {
    this.value = value ?? '';
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouchedCallback = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  protected onInput(event: Event): void {
    const nextValue = (event.target as HTMLInputElement).value;
    this.value = nextValue;
    this.onChange(nextValue);
  }

  protected onTouched(): void {
    this.onTouchedCallback();
  }

  protected toggleVisibility(): void {
    this.visible.update((current) => !current);
  }
}
