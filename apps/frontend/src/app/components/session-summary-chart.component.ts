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
            <h3>Sessions by Cookie Acceptance (Average Cookies per Session)</h3>
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

        // Kategorisiere Sessions basierend auf cookieBannerHandled
        const acceptedSessions = this.sessions.filter(s => s.cookieBannerHandled === 'yes');
        const rejectedSessions = this.sessions.filter(s => s.cookieBannerHandled === 'no');
        const optionalSessions = this.sessions.filter(s => s.cookieBannerHandled === 'opt');

        // Berechne durchschnittliche Cookie-Counts pro Kategorie
        const categories = ['Accepted (yes)', 'Rejected (no)', 'Optional (opt)'];
        const sessionGroups = [acceptedSessions, rejectedSessions, optionalSessions];

        const averageCookies = sessionGroups.map(group => {
            if (group.length === 0) return 0;
            let totalCookies = 0;

            group.forEach(session => {
                const classified = this.analyticsData[session.id as unknown as number];
                if (classified) {
                    const count = 
                        classified.firstparty.tracking.length +
                        classified.firstparty.nontracking.length +
                        classified.thirdparty.length;
                    totalCookies += count;
                }
            });

            return parseFloat((totalCookies / group.length).toFixed(1));
        });

        if (this.chartInstance) {
            this.chartInstance.destroy();
        }

        this.chartInstance = new ChartJS(ctx, {
            type: 'bar',
            data: {
                labels: categories,
                datasets: [
                    {
                        label: 'Average Cookies per Session',
                        data: averageCookies,
                        backgroundColor: ['#36A2EB', '#FF6384', '#FFCD56'],
                    }
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: false
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                    },
                    datalabels: {
                        display: true,
                        anchor: 'end',
                        align: 'top',
                        formatter: (value: number) => value,
                        font: {
                            weight: 'bold'
                        }
                    } as Record<string, unknown>
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Avg Cookies'
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
