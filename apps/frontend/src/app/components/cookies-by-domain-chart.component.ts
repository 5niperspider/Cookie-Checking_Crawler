import { Component, Input, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import Chart from 'chart.js/auto';
import { CookieStats } from '../services/cookie.service';

@Component({
  selector: 'app-cookies-by-domain-chart',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="chart-container">
      <h3>Cookies by Domain</h3>
      <canvas #barCanvas></canvas>
    </div>
  `,
  styles: [
    `
      .chart-container {
        position: relative;
        width: 100%;
        margin: 20px 0;
      }
      h3 {
        text-align: center;
        margin-bottom: 20px;
      }
    `,
  ],
})
export class CookiesByDomainChartComponent implements OnInit, AfterViewInit {
  @Input() stats?: CookieStats;
  @ViewChild('barCanvas') canvasRef?: ElementRef<HTMLCanvasElement>;

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

    const domains = Object.keys(this.stats.byDomain);
    const counts = Object.values(this.stats.byDomain);

    this.chart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: domains,
        datasets: [
          {
            label: 'Number of Cookies',
            data: counts,
            backgroundColor: 'rgba(54, 162, 235, 0.6)',
            borderColor: 'rgba(54, 162, 235, 1)',
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        plugins: {
          legend: {
            display: false,
          },
          title: {
            display: true,
            text: 'Distribution by Domain',
          },
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              stepSize: 1,
            },
          },
        },
      },
    });
  }

  private updateChart() {
    if (!this.chart || !this.stats) return;

    const domains = Object.keys(this.stats.byDomain);
    const counts = Object.values(this.stats.byDomain);

    this.chart.data.labels = domains;
    this.chart.data.datasets[0].data = counts as number[];
    this.chart.update();
  }
}
