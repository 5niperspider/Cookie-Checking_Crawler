import { Component, Input, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import Chart from 'chart.js/auto';
import { CookieStats } from '../services/cookie.service';

@Component({
  selector: 'app-cookie-overview-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chart-container">
      <h3>Cookie Overview</h3>
      <canvas #pieCanvas></canvas>
    </div>
  `,
  styles: [
    `
      .chart-container {
        position: relative;
        width: 100%;
        max-width: 400px;
        margin: 20px auto;
      }
      h3 {
        text-align: center;
        margin-bottom: 20px;
      }
    `,
  ],
})
export class CookieOverviewChartComponent implements OnInit, AfterViewInit {
  @Input() stats?: CookieStats;
  @ViewChild('pieCanvas') canvasRef?: ElementRef<HTMLCanvasElement>;
  
  private chart?: Chart;

  ngOnInit() {}

  ngAfterViewInit() {
    if (this.stats && this.canvasRef) {
      this.createChart();
    }
  }

  ngOnChanges() {
    if (this.stats && this.chart) {
      this.updateChart();
    }
  }

  private createChart() {
    if (!this.canvasRef || !this.stats) return;

    const ctx = this.canvasRef.nativeElement.getContext('2d');
    if (!ctx) return;

    this.chart = new Chart(ctx, {
      type: 'pie',
      data: {
        labels: ['Third-Party', 'First-Party'],
        datasets: [
          {
            data: [
              this.stats.thirdPartyCookies,
              this.stats.firstPartyCookies,
            ],
            backgroundColor: ['#FF6384', '#36A2EB'],
            borderColor: ['#FF6384', '#36A2EB'],
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            position: 'bottom' as const,
          },
          title: {
            display: true,
            text: 'Cookie Distribution',
          },
        },
      },
    });
  }

  private updateChart() {
    if (!this.chart || !this.stats) return;

    this.chart.data.datasets[0].data = [
      this.stats.thirdPartyCookies,
      this.stats.firstPartyCookies,
    ];
    this.chart.update();
  }
}
