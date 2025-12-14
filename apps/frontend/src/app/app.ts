import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MyComponent } from "./pages/component/component";

@Component({
  imports: [RouterModule, MyComponent],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'frontend';
}
