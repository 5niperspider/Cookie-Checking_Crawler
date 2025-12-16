import { Component, Input, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ChartOptions,
} from 'chart.js';
// import { BaseChartDirective } from 'ng2-charts';
import { CookieStats } from '../services/cookie.service';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
);

@Component({
    selector: 'app-cookies-by-domain-chart',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="chart-container">
            <h3>Cookies by Domain</h3>
            <canvas #canvas></canvas>
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
    @ViewChild('canvas', { static: true }) canvasRef!: ElementRef<HTMLCanvasElement>;
    @Input() stats?: CookieStats;

    private chartInstance?: ChartJS;

    ngOnInit() {
        // nothing needed here
    }

    ngAfterViewInit(): void {
        this.renderChart();
    }

    ngOnChanges(): void {
        this.renderChart();
    }

    private renderChart() {
        if (!this.canvasRef) return;

        const ctx = this.canvasRef.nativeElement.getContext('2d');
        if (!ctx) return;

        // Destroy previous chart if exists
        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        const domains = this.stats?.byDomain ? Object.keys(this.stats.byDomain) : [];
        const counts = domains.map((d) => this.stats!.byDomain[d] ?? 0);

        this.chartInstance = new ChartJS(ctx, {
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
}
