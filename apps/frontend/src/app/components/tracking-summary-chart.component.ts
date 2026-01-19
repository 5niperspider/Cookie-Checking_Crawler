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
    selector: 'app-tracking-summary-chart',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="chart-container">
            <h3>Summary of the tracking cookies</h3>
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
export class TrackingSummaryChartComponent implements OnInit, AfterViewInit, OnChanges {
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
        const browserColors = ['#FF6384', '#36A2EB', '#FF9F40'];

        const datasets = browsers.map((browserLabel, browserIndex) => {
            const browserKey = browserKeys[browserIndex];
            
            const data = configValues.map(configValue => {
                // Determine matching sessions for this Browser AND Category
                const group = this.sessions.filter(s => 
                    s.browser?.toLowerCase() === browserKey && 
                    s.cookieBannerHandled === configValue
                );

                if (group.length === 0) return 0;
                
                let totalCookies = 0;
                group.forEach(session => {
                    const classified = this.analyticsData[String(session.id)];
                    if (classified) {
                        // Calculate ONLY tracking cookies (First-party Tracking + Third-party)
                        const count = 
                            (classified.firstparty?.tracking?.length || 0) +
                            (classified.thirdparty?.length || 0);
                        totalCookies += count;
                    }
                });
                return parseFloat((totalCookies / group.length).toFixed(1));
            });

            return {
                label: browserLabel,
                data: data,
                backgroundColor: browserColors[browserIndex],
                barPercentage: 0.8,
                categoryPercentage: 0.9
            };
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
                        text: 'Average Tracking Cookies per Session',
                        padding: {
                            bottom: 20
                        }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                    },
                    legend: {
                        position: 'top',
                        labels: {
                            padding: 20
                        }
                    },
                    datalabels: {
                        display: true,
                        anchor: 'end',
                        align: 'top',
                        formatter: (value: number) => value > 0 ? value : '',
                        font: {
                            weight: 'bold'
                        }
                    } as Record<string, unknown>
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grace: '10%',
                        title: {
                            display: true,
                            text: 'Avg Tracking Cookies'
                        }
                    },
                    x: {
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
