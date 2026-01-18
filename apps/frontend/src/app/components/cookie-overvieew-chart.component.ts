import { Component, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-cookie-overview-chart',
  standalone: true,
  imports: [CommonModule],
  template: `<div>URL Cookie Overview Chart</div>`
})
export class CookieOverviewChartComponent implements OnInit {
  @Input() stats: any = null;

  ngOnInit() {
    console.log('Cookie Overview Stats:', this.stats);
  }
}
