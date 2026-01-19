import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, Input, OnChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { AnalyticsService, AnalyticsResult } from '../services/analytics.service';
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
    selector: 'app-session-summary-chart',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="chart-container">
            <h3>Sessions summary all cookies</h3>
            <div class="chart-wrapper">
                <canvas #canvas></canvas>
            </div>
        </div>
    `,
    styles: [
        `
            .chart-container {
                width: 100%;
                margin: 20px 0;
            }
            .chart-wrapper {
                position: relative;
                height: 400px;
                background: white;
                border: 1px solid #ddd;
                border-radius: 8px;
                padding: 15px;
            }
            h3 {
                text-align: center;
                margin-bottom: 15px;
                font-weight: bold;
            }
        `,
    ],
})
export class SessionSummaryChartComponent implements OnInit, AfterViewInit, OnChanges {
    @ViewChild('canvas') canvasRef?: ElementRef<HTMLCanvasElement>;
    @Input() sessions: CrawlSession[] = [];

    private chartInstance?: ChartJS;
    private analyticsData: AnalyticsResult = {};
    private analyticsService = inject(AnalyticsService);

    ngOnInit() {
        this.loadAnalyticsData();
    }

    ngAfterViewInit(): void {
        this.renderChart();
    }

    ngOnChanges() {
        this.renderChart();
    }

    private loadAnalyticsData() {
        this.analyticsService.getAnalytics().subscribe({
            next: (data) => {
                this.analyticsData = data;
                this.renderChart();
            },
            error: (err) => {
                console.error('Error loading analytics data:', err);
            }
        });
    }

    private renderChart() {
        if (!this.canvasRef || !this.sessions.length) return;

        const ctx = this.canvasRef.nativeElement.getContext('2d');
        if (!ctx) return;

        // Categories (X-Axis)
        const categories = ['Ablehnen', 'Akzeptieren', 'Optional'];
        const configValues = ['no', 'yes', 'opt'] as const;

        // Browsers (Datasets)
        const browsers = ['Chrome', 'Firefox', 'Brave'];
        const browserKeys = ['chrome', 'firefox', 'brave'];
        // Colors: Chrome (Pink), Firefox (Blue), Brave (Orange)
        // Solid for Tracking, Transparent/Light for Other
        const browserColors = ['#FF6384', '#36A2EB', '#FF9F40'];
        const browserColorsLight = ['#FF638480', '#36A2EB80', '#FF9F4080']; // 50% opacity

        const datasets: any[] = [];

        browsers.forEach((browserLabel, browserIndex) => {
            const browserKey = browserKeys[browserIndex];

            // 1. Data for "Tracking Cookies" (Bottom of stack)
            const trackingData = configValues.map(configValue => {
                const group = this.sessions.filter(s =>
                    s.browser?.toLowerCase() === browserKey &&
                    s.cookieBannerHandled === configValue
                );
                if (group.length === 0) return 0;

                let sum = 0;
                group.forEach(session => {
                    const classified = this.analyticsData[String(session.id)];
                    if (classified) {
                        // Tracking = First-party Tracking + Third-party
                        const count =
                            (classified.firstparty?.tracking?.length || 0) +
                            (classified.thirdparty?.length || 0);
                        sum += count;
                    }
                });
                return parseFloat((sum / group.length).toFixed(1));
            });

            // 2. Data for "Other Cookies" (Top of stack)
            const otherData = configValues.map(configValue => {
                const group = this.sessions.filter(s =>
                    s.browser?.toLowerCase() === browserKey &&
                    s.cookieBannerHandled === configValue
                );
                if (group.length === 0) return 0;

                let sum = 0;
                group.forEach(session => {
                    const classified = this.analyticsData[String(session.id)];
                    if (classified) {
                        // Other = First-party Non-tracking
                        const count = (classified.firstparty?.nontracking?.length || 0);
                        sum += count;
                    }
                });
                return parseFloat((sum / group.length).toFixed(1));
            });

            // Push datasets
            // Tracking (Solid)
            datasets.push({
                label: `${browserLabel} (Tracking)`,
                data: trackingData,
                backgroundColor: browserColors[browserIndex],
                stack: browserKey, // Stack Group
                barPercentage: 0.8,
                categoryPercentage: 0.9
            });

            // Other (Light)
            datasets.push({
                label: `${browserLabel} (Other)`,
                data: otherData,
                backgroundColor: browserColorsLight[browserIndex],
                stack: browserKey, // Stack Group
                barPercentage: 0.8,
                categoryPercentage: 0.9
            });
        });

        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        this.chartInstance = new ChartJS(ctx, {
            type: 'bar',
            data: {
                labels: categories,
                datasets: datasets
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: {
                        top: 30
                    }
                },
                plugins: {
                    title: {
                        display: true,
                        text: 'Average Cookies (Tracking vs Other)',
                        padding: {
                            bottom: 20
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            // Optional: Add total to tooltip footer? Or just rely on separate items.
                        }
                    },
                    legend: {
                        position: 'top',
                        labels: {
                            padding: 20,
                            filter: (item) => {
                                // Optional: clean up legend if it's too crowded, but user didn't ask.
                                // Showing all 6 items (3 browsers * 2 types) is probably fine.
                                return true;
                            }
                        }
                    },
                    datalabels: {
                        display: true,
                        anchor: 'center', // Center of each stack segment
                        align: 'center',
                        formatter: (value: number) => value > 0 ? value : '',
                        color: 'black', // Maybe white on dark? keeping it simple black for now or conditionally?
                        // If values are small, labels might overlap.
                        // I'll leave as is, or maybe 'white' for solid bars?
                        // Let's stick to default/black for visibility on light colors. 
                        // Actually, on solid dark(ish) colors, white is better.
                        // But on light colors, black is better.
                        // I'll use a dynamic color function if needed, but for now simple:
                        font: {
                            weight: 'bold'
                        }
                    } as Record<string, unknown>
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grace: '10%',
                        stacked: true, // Enable stacking on Y
                        title: {
                            display: true,
                            text: 'Avg Cookies'
                        }
                    },
                    x: {
                        stacked: true, // Enable stacking on X (within groups defined by 'stack')
                        title: {
                            display: true,
                            text: 'Category'
                        }
                    }
                }
            }
        });
    }
}
