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
    ChartData,
    ChartOptions,
} from 'chart.js';
import ChartDataLabels from 'chartjs-plugin-datalabels';
import { CookieStats } from '../services/cookie.service';

ChartJS.register(
    CategoryScale,
    LinearScale,
    BarElement,
    Title,
    Tooltip,
    Legend,
    ChartDataLabels
);

// Define interfaces for the dummy data structure
import { CrawlSession, AnalyticsResult } from '../services/cookie.service';

@Component({
    selector: 'app-cookies-by-domain-chart',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="controls">
            <span>Layout: </span>
            <button (click)="layout = 'row'" [class.active]="layout === 'row'">Side-by-Side</button>
            <button (click)="layout = 'column'" [class.active]="layout === 'column'">Stacked</button>
        </div>
        <div class="charts-container" [ngClass]="layout">
            <div class="chart-wrapper" *ngFor="let group of groupedSessions; let i = index">
                <h3>Category: {{ group.category }}</h3>
                <div class="scroll-container">
                    <div class="chart-inner" [style.min-width.px]="getMinWidth(group)">
                        <canvas #canvas></canvas>
                    </div>
                </div>
            </div>
        </div>
    `,
    styles: [
        `
            .controls {
                margin-bottom: 15px;
                display: flex;
                gap: 10px;
                align-items: center;
            }
            .controls button {
                padding: 6px 12px;
                border: 1px solid #ccc;
                background: #f8f8f8;
                border-radius: 4px;
                cursor: pointer;
            }
            .controls button.active {
                background: #36a2eb;
                color: white;
                border-color: #36a2eb;
            }

            .charts-container {
                display: flex;
                gap: 20px;
                padding-bottom: 20px;
            }

            /* Row Layout (Default) */
            .charts-container.row {
                flex-direction: row;
                overflow-x: auto;
            }
            .charts-container.row .chart-wrapper {
                flex: 1;
                min-width: 300px;
            }

            /* Column Layout (Stacked) */
            .charts-container.column {
                flex-direction: column;
            }
            .charts-container.column .chart-wrapper {
                width: 100%;
            }

            .chart-wrapper {
                border: 1px solid #ddd;
                padding: 10px;
                border-radius: 8px;
                background: white;
            }
            .scroll-container {
                width: 100%;
                overflow-x: auto;
                border: 1px solid #eee;
            }
            .chart-inner {
                position: relative;
                height: 400px;
            }
            h3 {
                text-align: center;
                margin-bottom: 10px;
                font-weight: bold;
            }
        `,
    ],
})
export class CookiesByDomainChartComponent implements OnInit, AfterViewInit, OnChanges {
    @ViewChildren('canvas') canvasRefs!: QueryList<ElementRef<HTMLCanvasElement>>;
    @Input() sessions: CrawlSession[] = [];
    @Input() analyticsData: AnalyticsResult = {};

    public groupedSessions: { category: string, sessions: CrawlSession[] }[] = [];
    public layout: 'row' | 'column' = 'row';
    private chartInstances: ChartJS[] = [];

    ngOnInit() {
        // nothing needed here
    }

    ngAfterViewInit(): void {
        this.renderCharts();
    }



    getMinWidth(group: { category: string, sessions: CrawlSession[] }): number {
        const sessionCount = group.sessions.length;
        // Make sure there is enough space. 30px per session minimum.
        return Math.max(800, sessionCount * 40);
    }

    private renderCharts() {
        if (!this.canvasRefs) return;

        // Group sessions
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

        // Wait for view update with setTimeout or assume change detection passes?
        // Actually, we can't reliably render canvas immediately after changing groupedSessions because logic relies on *ngFor canvasRefs.
        // We need CD to run.
        // Quick fix: renderCharts logic is separated. But canvasRefs needs to match grouping.
        // A better approach in Angular is separate component per chart or direct logic.
        // For now, let's assume we call this only after view init / changes. But wait, changing groupedSessions changes DOM.
        // We should move grouping to OnChanges and triggering render after a tick.

    }

    private drawCharts() {
        if (!this.canvasRefs || this.canvasRefs.length !== this.groupedSessions.length) return;

        this.chartInstances.forEach(c => c.destroy());
        this.chartInstances = [];

        this.canvasRefs.forEach((canvasRef, index) => {
            const group = this.groupedSessions[index];
            if (!group) return;

            const ctx = canvasRef.nativeElement.getContext('2d');
            if (!ctx) return;

            const urls = group.sessions.map(s => s.url);
            const browsers = ['Chrome', 'Firefox', 'Edge'];

            const browserColors: { [key: string]: string } = {
                'Chrome': '#FF6384',
                'Firefox': '#36A2EB',
                'Edge': '#FFCD56'
            };

            const datasets = browsers.map(browser => {
                const dataPoints = group.sessions.map(session => {
                    // Only populate if this session matches the browser
                    if (session.browser !== browser) return 0;

                    const sessionIdNum = parseInt(session.id, 10) || session.id as any;
                    const sessionData = this.analyticsData[sessionIdNum];
                    if (!sessionData) return 0;

                    return (sessionData.firstparty.nontracking.length || 0) +
                        (sessionData.firstparty.tracking.length || 0) +
                        (sessionData.thirdparty.length || 0);
                });

                return {
                    label: browser,
                    data: dataPoints,
                    backgroundColor: browserColors[browser],
                    stack: 'stack1',
                };
            });

            const chart = new ChartJS(ctx, {
                type: 'bar',
                data: {
                    labels: urls,
                    datasets: datasets,
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'nearest',
                        intersect: true,
                        axis: 'x'
                    },
                    layout: {
                        padding: {
                            top: 25
                        }
                    },
                    plugins: {
                        legend: {
                            display: true
                        },
                        title: {
                            display: false,
                        },
                        tooltip: {
                            mode: 'nearest',
                            intersect: true,
                        },
                        // @ts-ignore
                        datalabels: {
                            color: '#000',
                            anchor: 'end',
                            align: 'start',
                            rotation: -90,
                            offset: 4,
                            display: (context: any) => {
                                // Find which dataset is active for this index to avoid cluttered labels if possible, 
                                // OR just show total? 
                                // Since we stack and user only has 1 browser, only 1 value > 0.
                                return context.dataset.data[context.dataIndex] > 0;
                            },
                            formatter: (value: any, context: any) => {
                                const label = context.chart.data.labels[context.dataIndex];
                                return label;
                            },
                            font: {
                                weight: 'bold',
                                size: 10
                            },
                            clamp: true,
                            clip: true
                        }
                    },
                    scales: {
                        x: {
                            stacked: true,
                            title: {
                                display: true,
                                text: 'Session URL'
                            },
                            ticks: {
                                maxRotation: 90,
                                minRotation: 90,
                                // Hide labels on X axis if too crowded, data labels show them on bars
                                display: false
                            }
                        },
                        y: {
                            stacked: true,
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Total Cookies'
                            }
                        },
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
