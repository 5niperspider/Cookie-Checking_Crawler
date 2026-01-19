import { Component, Input, OnInit, ViewChildren, ElementRef, AfterViewInit, OnChanges, QueryList, inject } from '@angular/core';
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
import { CookieStats } from '../services/cookie.service';
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
    selector: 'app-cookies-by-domain-chart',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="charts-container">
            <div class="chart-wrapper" *ngFor="let configValue of configValues; let i = index">
                <h3>Cookies: {{ configValue === 'yes' ? 'Accepted' : configValue === 'no' ? 'Rejected' : 'Optional' }}</h3>
                <div class="chart-inner">
                    <canvas #canvas></canvas>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .charts-container {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            padding: 20px 0;
        }
        .chart-wrapper {
            border: 1px solid #ddd;
            padding: 15px;
            border-radius: 8px;
            background: white;
        }
        .chart-inner {
            position: relative;
            height: 400px;
        }
        h3 {
            text-align: center;
            margin: 0 0 15px 0;
            font-weight: bold;
            font-size: 16px;
        }
    `]
})
export class CookiesByDomainChartComponent implements OnInit, AfterViewInit, OnChanges {
    @ViewChildren('canvas') canvasRefs!: QueryList<ElementRef<HTMLCanvasElement>>;
    @Input() stats?: CookieStats;
    @Input() sessions: CrawlSession[] = [];

    public configValues: Array<'yes' | 'no' | 'opt'> = ['yes', 'no', 'opt'];
    private chartInstances: ChartJS[] = [];
    private analyticsData: AnalyticsResult = {};

    private analyticsService = inject(AnalyticsService);

    ngOnInit() {
        this.loadAnalyticsData();
    }

    ngAfterViewInit(): void {
        this.renderCharts();
    }



    private loadAnalyticsData() {
        this.analyticsService.getAnalytics().subscribe({
            next: (data: AnalyticsResult) => {
                this.analyticsData = data;
                this.renderCharts();
            },
            error: (err: unknown) => {
                console.error('Error loading analytics data:', err);
            }
        });
    }

    private renderCharts() {
        if (!this.canvasRefs || this.sessions.length === 0) return;

        this.chartInstances.forEach(c => c.destroy());
        this.chartInstances = [];

        const browsers = ['chrome', 'firefox', 'brave'] as const;
        const browserLabels = ['Chrome', 'Firefox', 'Brave'];
        const browserColors = ['#4285F4', '#FF7139', '#FB542B'];

        this.canvasRefs.forEach((canvasRef, configIndex) => {
            const targetConfigValue = this.configValues[configIndex];

            // Filtere Sessions NACH cookieBannerHandled
            const filteredSessions = this.sessions.filter(
                s => s.cookieBannerHandled === targetConfigValue
            );

            if (filteredSessions.length === 0) {
                const ctx = canvasRef.nativeElement.getContext('2d');
                if (ctx) {
                    this.chartInstances.push(new ChartJS(ctx, {
                        type: 'bar',
                        data: { labels: [], datasets: [] },
                        options: { responsive: true, maintainAspectRatio: false }
                    }));
                }
                return;
            }

            // Pro Browser: Total Cookies + Session-Anzahl
            const totalCookiesPerBrowser = [0, 0, 0];
            const browserSessionCounts = [0, 0, 0];

            filteredSessions.forEach(session => {
                const idx = browsers.indexOf(session.browser as typeof browsers[number]);
                if (idx === -1) return;

                // ← TYPE-FIX: (as any) für String(session.id)
                const sessionKey = String(session.id);
                const classified = (this.analyticsData as any)[sessionKey];
                
                if (classified) {
                    const allCookies = [
                        ...(classified.firstparty?.nontracking || []),
                        ...(classified.firstparty?.tracking || []),
                        ...(classified.thirdparty || [])
                    ];
                    totalCookiesPerBrowser[idx] += allCookies.length;
                }
                browserSessionCounts[idx]++;
            });

            // Ø Cookies pro Session und Browser
            const browserAverages = totalCookiesPerBrowser.map((total, idx) =>
                browserSessionCounts[idx] > 0 ? total / browserSessionCounts[idx] : 0
            );

            const ctx = canvasRef.nativeElement.getContext('2d');
            if (!ctx) return;

            const chart = new ChartJS(ctx, {
                type: 'bar',
                data: {
                    labels: browserLabels,
                    datasets: [{
                        label: 'Ø Cookies pro Session',
                        data: browserAverages,
                        backgroundColor: browserColors,
                        borderColor: browserColors.map(c => c + 'CC'),
                        borderWidth: 1
                    }],
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true
                        },
                        tooltip: {
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            padding: 12,
                            titleFont: { size: 14, weight: 'bold' },
                            bodyFont: { size: 12 },
                            callbacks: {
                                title: (context) => {
                                    const i = context[0].dataIndex;
                                    const sessions = browserSessionCounts[i];
                                    const total = totalCookiesPerBrowser[i];
                                    return `${browserLabels[i]}\n${sessions} Sessions | Total: ${total} cookies`;
                                },
                                label: (context) => {
                                    const avg = context.parsed.y;
                                    return `Ø ${avg?.toFixed(1)} cookies/Session`;
                                }
                            }
                        },
                        datalabels: {
                            display: true,
                            color: 'black',
                            font: { weight: 'bold', size: 12 },
                            formatter: (value: number) => value.toFixed(1)
                        } as Record<string, unknown>
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Ø Cookies pro Session',
                                font: { weight: 'bold' }
                            },
                            ticks: { stepSize: 1 }
                        },
                        x: {
                            title: {
                                display: true,
                                text: 'Browser',
                                font: { weight: 'bold' }
                            }
                        }
                    },
                },
            });

            this.chartInstances.push(chart);
        });
    }

    ngOnChanges(): void {
        this.groupedSessions = [
            {
                category: 'Accepted',
                sessions: this.sessions.filter(s => s.cookieBannerHandled)
            },
            {
                category: 'Ignored/Rejected',
                sessions: this.sessions.filter(s => !s.cookieBannerHandled)
            }
        ];
        // Give ViewChild time to update
        setTimeout(() => this.drawCharts(), 0);
    }
}
