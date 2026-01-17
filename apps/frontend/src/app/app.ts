import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

import { MyComponent } from './pages/component/component';
import { TxtFileUploadComponent } from './pages/txt-file-upload/txt-file-upload';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    MyComponent,
    TxtFileUploadComponent
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'frontend';
}
