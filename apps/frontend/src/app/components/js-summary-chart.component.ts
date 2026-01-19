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
            height: 450px;
        }
        h3 {
            text-align: center;
            margin: 0 0 15px 0;
            font-weight: bold;
            font-size: 16px;
        }
    `]
})
// Chart component for comparing cookies with JS enabled vs disabled
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

    // Render charts
    private renderCharts() {
        if (!this.canvasJsActive || !this.canvasJsInactive || this.sessions.length === 0) return;

        this.chartInstances.forEach(c => c.destroy());
        this.chartInstances = [];

        const browsers = ['Chrome', 'Firefox', 'Brave'];
        const browserKeys = ['chrome', 'firefox', 'brave'];
        const browserColors = ['#FF6384', '#36A2EB', '#FF9F40'];
        const browserColorsTransparent = ['rgba(255, 99, 132, 0.5)', 'rgba(54, 162, 235, 0.5)', 'rgba(255, 159, 64, 0.5)'];

        // Helper: Count Cookies Split by Tracking vs Other
        const countCookies = (jsEnabled: boolean) => {
            const trackingCounts: number[] = [];
            const otherCounts: number[] = [];

            browsers.forEach((_, bIdx) => {
                const browserKey = browserKeys[bIdx];

                const targetSessions = this.sessions.filter(s =>
                    s.browser?.toLowerCase() === browserKey &&
                    s.jsEnabled === jsEnabled
                );

                let trackingSum = 0;
                let otherSum = 0;

                targetSessions.forEach(session => {
                    const data = this.analyticsData[session.id];
                    if (data) {
                        // Tracking = FirstParty Tracking + ThirdParty
                        const tracking = (data.firstparty?.tracking?.length || 0) + (data.thirdparty?.length || 0);
                        // Other = FirstParty NonTracking
                        const other = (data.firstparty?.nontracking?.length || 0);

                        trackingSum += tracking;
                        otherSum += other;
                    }
                });

                // Calculate Averages
                const count = targetSessions.length;
                trackingCounts.push(count > 0 ? parseFloat((trackingSum / count).toFixed(1)) : 0);
                otherCounts.push(count > 0 ? parseFloat((otherSum / count).toFixed(1)) : 0);
            });

            return { tracking: trackingCounts, other: otherCounts };
        };

        const activeData = countCookies(true);
        const inactiveData = countCookies(false);

        // Calculate Global Max for Y-Axis
        const getMaxValue = (d: { tracking: number[], other: number[] }) => {
            if (!d.tracking.length) return 0;
            return Math.max(...d.tracking.map((t, i) => t + d.other[i]));
        };

        // Use Math.ceil to handle decimals for the axis max
        const maxActive = Math.ceil(getMaxValue(activeData));
        const maxInactive = Math.ceil(getMaxValue(inactiveData));
        const globalMax = Math.max(maxActive, maxInactive);

        // Chart 1: JS Active
        const ctxActive = this.canvasJsActive.first?.nativeElement.getContext('2d');
        if (ctxActive) {
            this.createStackedChart(ctxActive, 'Average Cookies (JS Enabled)', browsers, activeData, browserColors, browserColorsTransparent, globalMax);
        }

        // Chart 2: JS Inactive
        const ctxInactive = this.canvasJsInactive.first?.nativeElement.getContext('2d');
        if (ctxInactive) {
            this.createStackedChart(ctxInactive, 'Average Cookies (JS Disabled)', browsers, inactiveData, browserColors, browserColorsTransparent, globalMax);
        }
    }

    // Create stacked chart
    private createStackedChart(
        ctx: CanvasRenderingContext2D,
        title: string,
        labels: string[],
        data: { tracking: number[], other: number[] },
        colorsSolid: string[],
        colorsTransparent: string[],
        maxY: number
    ) {
        const chart = new ChartJS(ctx, {
            type: 'bar',
            data: {
                labels: labels,
                datasets: [
                    {
                        label: 'Tracking Cookies',
                        data: data.tracking,
                        backgroundColor: colorsSolid,
                        stack: 'stack0',
                        minBarLength: 5
                    },
                    {
                        label: 'Other Cookies',
                        data: data.other,
                        backgroundColor: colorsTransparent,
                        stack: 'stack0',
                        minBarLength: 5
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                layout: {
                    padding: { top: 30 }
                },
                plugins: {
                    legend: {
                        display: true,
                        position: 'bottom',
                        labels: {
                            generateLabels: (chart) => {
                                const original = ChartJS.defaults.plugins.legend.labels.generateLabels(chart);
                                original.forEach(label => {
                                    if (label.text === 'Tracking Cookies') label.fillStyle = 'gray';
                                    if (label.text === 'Other Cookies') label.fillStyle = 'lightgray';
                                });
                                return original;
                            }
                        }
                    },
                    title: {
                        display: true,
                        text: title,
                        padding: { bottom: 20 }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            footer: (tooltipItems) => {
                                let sum = 0;
                                tooltipItems.forEach(t => sum += (t.parsed.y || 0));
                                return `Total Avg: ${sum.toFixed(1)}`;
                            }
                        }
                    },
                    datalabels: {
                        display: true,
                        color: 'black',
                        font: { weight: 'bold' },
                        formatter: (value: number) => {
                            return value > 0 ? value : '';
                        }
                    } as Record<string, unknown>
                },
                scales: {
                    y: {
                        stacked: true,
                        beginAtZero: true,
                        grace: '10%',
                        suggestedMax: maxY,
                        title: { display: true, text: 'Avg Cookies' },
                        ticks: { stepSize: 1 }
                    },
                    x: {
                        stacked: true
                    }
                }
            }
        });
        this.chartInstances.push(chart);
    }
}
