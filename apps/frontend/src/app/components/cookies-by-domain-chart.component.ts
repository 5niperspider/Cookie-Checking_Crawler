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
        <div class="controls">
            <span class="label">Layout:</span>
            <div class="btn-group">
                <button [class.active]="containerLayout === 'row'" (click)="setContainerLayout('row')">Side-by-Side</button>
                <button [class.active]="containerLayout === 'column'" (click)="setContainerLayout('column')">Stacked</button>
            </div>
        </div>
        <div class="charts-container" [class.stacked-layout]="containerLayout === 'column'">
            <div class="chart-wrapper" *ngFor="let configValue of configValues; let i = index">
                <h3>Cookies: {{ configValue === 'yes' ? 'Accepted' : configValue === 'no' ? 'Rejected' : 'Optional' }}</h3>
                <div class="chart-inner">
                    <canvas #canvas></canvas>
                </div>
            </div>
        </div>
    `,
    styles: [`
        .controls {
            display: flex;
            align-items: center;
            gap: 15px;
            margin-bottom: 20px;
        }
        .label {
            font-weight: bold;
            font-size: 14px;
        }
        .btn-group {
            display: flex;
            border: 1px solid #ddd;
            border-radius: 4px;
            overflow: hidden;
        }
        .btn-group button {
            background: white;
            border: none;
            padding: 8px 16px;
            cursor: pointer;
            font-size: 13px;
            border-right: 1px solid #ddd;
        }
        .btn-group button:last-child {
            border-right: none;
        }
        .btn-group button.active {
            background: #36A2EB;
            color: white;
        }
        .charts-container {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            padding: 20px 0;
        }
        .charts-container.stacked-layout {
            grid-template-columns: 1fr;
        }
        .chart-wrapper {
            border: 1px solid #ddd;
            padding: 15px;
            border-radius: 8px;
            background: white;
            min-width: 0; /* Critical for CSS Grid resizing */
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

    public configValues: Array<'yes' | 'no' | 'opt'> = ['no', 'yes', 'opt']; // Default order
    public containerLayout: 'row' | 'column' = 'row';
    private chartInstances: ChartJS[] = [];
    private analyticsData: AnalyticsResult = {};

    private analyticsService = inject(AnalyticsService);

    ngOnInit() {
        this.loadAnalyticsData();
    }

    ngAfterViewInit(): void {
        this.renderCharts();
    }

    setContainerLayout(layout: 'row' | 'column') {
        this.containerLayout = layout;
        // Trigger resize to ensure charts adapt to new container width
        setTimeout(() => {
            this.chartInstances.forEach(c => c.resize());
        }, 0);
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

        // Browsers & Colors
        const browsers = ['Chrome', 'Firefox', 'Brave'];
        const browserKeys = ['chrome', 'firefox', 'brave'];
        const browserColors = ['#FF6384', '#36A2EB', '#FF9F40'];

        // 1. Pre-calculate data for all charts to find Global Max Y
        const preparedData = this.configValues.map(configValue => {
            const categorySessions = this.sessions.filter(
                s => s.cookieBannerHandled === configValue
            );

            if (categorySessions.length === 0) {
                return { hasData: false, labels: [], datasets: [] };
            }

            const uniqueUrls = Array.from(new Set(categorySessions.map(s => s.url))).sort();

            const datasets = browsers.map((browserLabel, bIdx) => {
                const browserKey = browserKeys[bIdx];
                const dataPoints = uniqueUrls.map(url => {
                    const matchingSessions = categorySessions.filter(s =>
                        s.url === url && s.browser?.toLowerCase() === browserKey
                    );
                    if (matchingSessions.length === 0) return 0;

                    let total = 0;
                    matchingSessions.forEach(sess => {
                        const classified = (this.analyticsData as any)[String(sess.id)];
                        if (classified) {
                            const count =
                                (classified.firstparty?.nontracking?.length || 0) +
                                (classified.firstparty?.tracking?.length || 0) +
                                (classified.thirdparty?.length || 0);
                            total += count;
                        }
                    });
                    return parseFloat((total / matchingSessions.length).toFixed(1));
                });

                return {
                    label: browserLabel,
                    data: dataPoints,
                    backgroundColor: browserColors[bIdx],
                    stack: 'Stack 0',
                };
            });

            return { hasData: true, labels: uniqueUrls, datasets };
        });

        // 2. Find Global Max Y
        let globalMaxY = 0;
        preparedData.forEach(item => {
            if (item.hasData) {
                item.datasets.forEach(ds => {
                    const maxInDs = Math.max(...ds.data);
                    if (maxInDs > globalMaxY) globalMaxY = maxInDs;
                });
            }
        });

        // 3. Render Charts
        this.canvasRefs.forEach((canvasRef, index) => {
            const data = preparedData[index];
            const ctx = canvasRef.nativeElement.getContext('2d');

            if (ctx) {
                // If no data, render empty chart
                if (!data.hasData) {
                    this.chartInstances.push(new ChartJS(ctx, {
                        type: 'bar',
                        data: { labels: [], datasets: [] },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            scales: {
                                y: {
                                    suggestedMax: globalMaxY || 10 // Use global max even for empty to align? Or default.
                                }
                            }
                        }
                    }));
                    return;
                }

                const chart = new ChartJS(ctx, {
                    type: 'bar',
                    data: {
                        labels: data.labels,
                        datasets: data.datasets
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        layout: {
                            padding: { top: 20 }
                        },
                        plugins: {
                            legend: {
                                position: 'top',
                                labels: { padding: 15 }
                            },
                            tooltip: {
                                mode: 'index',
                                intersect: false
                            },
                            datalabels: {
                                display: true,
                                color: 'black',
                                font: { weight: 'bold', size: 10 },
                                formatter: (val: number) => val > 0 ? val : '',
                                anchor: 'center',
                                align: 'center'
                            } as Record<string, unknown>
                        },
                        scales: {
                            x: {
                                stacked: true,
                                title: {
                                    display: true,
                                    text: 'Website (URL)'
                                },
                                ticks: {
                                    maxRotation: 90,
                                    minRotation: 90
                                }
                            },
                            y: {
                                stacked: true,
                                beginAtZero: true,
                                grace: '5%',
                                suggestedMax: globalMaxY, // <--- Synchronized Y-Axis
                                title: {
                                    display: true,
                                    text: 'Total Cookies'
                                }
                            }
                        }
                    }
                });
                this.chartInstances.push(chart);
            }
        });
    }

    ngOnChanges(): void {
        // Give ViewChild time to update
        setTimeout(() => this.renderCharts(), 0);
    }
}
