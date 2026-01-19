import { Component, Input, OnInit, ViewChildren, ElementRef, AfterViewInit, OnChanges, QueryList } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { AnalyticsResult } from '../services/analytics.service';
import { CrawlSession } from '../services/cookie.service';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ChartDataLabels
);

@Component({
    selector: 'app-js-summary-chart',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="summary-charts-row">
            <!-- Chart 1: JS Enabled -->
            <div class="chart-wrapper">
                <h3> All Cookies with JavaScript Enabled</h3>
                <div class="chart-inner">
                    <canvas #canvasJsActive></canvas>
                </div>
            </div>

            <!-- Chart 2: JS Disabled -->
            <div class="chart-wrapper">
                <h3>All Cookies with JavaScript Disabled</h3>
                <div class="chart-inner">
                    <canvas #canvasJsInactive></canvas>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .summary-charts-row {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-top: 20px;
        }
        @media (max-width: 1000px) {
            .summary-charts-row {
                grid-template-columns: 1fr;
            }
        }
        .chart-wrapper {
            border: 1px solid #ddd;
            padding: 15px;
            border-radius: 8px;
            background: white;
            min-width: 0;
            padding-top: 30px;
        }
        .chart-inner {
            position: relative;
            height: 300px;
        }
        h3 {
            text-align: center;
            margin: 0 0 15px 0;
            font-weight: bold;
            font-size: 16px;
        }
    `]
})
export class JsSummaryChartComponent implements OnInit, AfterViewInit, OnChanges {
    @ViewChildren('canvasJsActive') canvasJsActive!: QueryList<ElementRef<HTMLCanvasElement>>;
    @ViewChildren('canvasJsInactive') canvasJsInactive!: QueryList<ElementRef<HTMLCanvasElement>>;

    @Input() sessions: CrawlSession[] = [];
    @Input() analyticsData: AnalyticsResult = {};

    private chartInstances: ChartJS[] = [];

    ngOnInit() {
        // Init logic if needed
    }

    ngAfterViewInit(): void {
        this.renderCharts();
    }

    ngOnChanges(): void {
        setTimeout(() => this.renderCharts(), 0);
    }

    private renderCharts() {
        if (!this.canvasJsActive || !this.canvasJsInactive || this.sessions.length === 0) return;

        this.chartInstances.forEach(c => c.destroy());
        this.chartInstances = [];

        const browsers = ['Chrome', 'Firefox', 'Brave'];
        const browserKeys = ['chrome', 'firefox', 'brave'];
        const browserColors = ['#FF6384', '#36A2EB', '#FF9F40'];

        // Helper: Count Cookies
        const countCookies = (jsEnabled: boolean) => {
            return browsers.map((browserLabel, bIdx) => {
                const browserKey = browserKeys[bIdx];

                // 1. Filter sessions for this browser & JS state
                const targetSessions = this.sessions.filter(s =>
                    s.browser?.toLowerCase() === browserKey &&
                    s.jsEnabled === jsEnabled
                );

                // 2. Sum cookies from analyticsData for these sessions
                let totalCookies = 0;
                targetSessions.forEach(session => {
                    const data = this.analyticsData[session.id];
                    if (data) {
                        const firstParty = (data.firstparty?.nontracking?.length || 0) + (data.firstparty?.tracking?.length || 0);
                        const thirdParty = data.thirdparty?.length || 0;
                        totalCookies += (firstParty + thirdParty);
                    }
                });

                return totalCookies;
            });
        };

        const activeCounts = countCookies(true);
        const inactiveCounts = countCookies(false);

        // Chart 1: JS Active
        const ctxActive = this.canvasJsActive.first?.nativeElement.getContext('2d');
        if (ctxActive) {
            this.createChart(ctxActive, 'Cookies (JS Active)', browsers, activeCounts, browserColors);
        }

        // Chart 2: JS Inactive
        const ctxInactive = this.canvasJsInactive.first?.nativeElement.getContext('2d');
        if (ctxInactive) {
            this.createChart(ctxInactive, 'Cookies (JS Inactive)', browsers, inactiveCounts, browserColors);
        }
    }

    private createChart(ctx: CanvasRenderingContext2D, title: string, labels: string[], data: number[], colors: string[]) {
        const chart = new ChartJS(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Total Cookies',
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: { top: 30 }
                },
                plugins: {
                    legend: { display: false },
                    title: {
                        display: true,
                        text: title,
                        padding: { bottom: 20 }
                    },
                    datalabels: {
                        display: true,
                        anchor: 'end',
                        align: 'top',
                        font: { weight: 'bold' }
                    } as Record<string, unknown>
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grace: '10%',
                        title: { display: true, text: 'Number of Cookies' },
                        ticks: { stepSize: 1 }
                    }
                }
            }
        });
        this.chartInstances.push(chart);
    }
}
