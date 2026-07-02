import { Injectable, signal } from '@angular/core';
import { NgxSpinnerService } from 'ngx-spinner';

@Injectable({
  providedIn: 'root'
})
export class SpinnerService {
  constructor(private spinner: NgxSpinnerService) {}
  public isLoading = signal(false);

  show() {
    this.isLoading.set(true);
    this.spinner.show();
  }

  hide() {
    this.isLoading.set(false);
    this.spinner.hide();
  }
}