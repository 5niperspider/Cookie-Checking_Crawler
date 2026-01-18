import { Component, OnInit, ViewChild, ElementRef, AfterViewInit, Input, OnChanges } from '@angular/core';
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
import { CrawlSession, AnalyticsResult, ClassifiedCookies } from '../services/cookie.service';

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
            <h3>Session Summary by Browser</h3>
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
export class SessionSummaryChartComponent implements OnInit, AfterViewInit {
    @ViewChild('canvas') canvasRef?: ElementRef<HTMLCanvasElement>;
    @Input() sessions: CrawlSession[] = [];
    @Input() analyticsData: AnalyticsResult = {};

    private chartInstance?: ChartJS;

    ngOnChanges() {
        this.renderChart();
    }

    ngOnInit() {
    }

    ngAfterViewInit(): void {
        this.renderChart();
    }

    private renderChart() {
        if (!this.canvasRef) return;

        const ctx = this.canvasRef.nativeElement.getContext('2d');
        if (!ctx) return;

        // Process Data
        const browsers = ['Chrome', 'Firefox', 'Brave'];
        // Group by what? Real data doesn't have 'categories' like 'Accept/Reject' explicitly unless we infer from cookieBannerHandled
        // Let's use 'Cookie Action' as categories: 'Accepted' (handled=true), 'Ignored/Rejected' (handled=false)
        const categories = ['Accepted', 'Ignored/Rejected', 'Optional'];

        // Calculate Averages
        const dataByBrowser: { [browser: string]: number[] } = {};

        browsers.forEach(browser => {
            dataByBrowser[browser] = categories.map(category => {

                // Find sessions for this browser and category
                const relevantSessions = this.sessions.filter(s =>
                    s.browser === browser && s.cookieBannerHandled === isAccepted
                );

                if (relevantSessions.length === 0) return 0;

                let totalCookies = 0;
                relevantSessions.forEach(session => {
                    const sessionIdNum = parseInt(session.id, 10) || session.id as any;
                    const sessionData = this.analyticsData[sessionIdNum];

                    if (sessionData) {
                        const count = (sessionData.firstparty.nontracking.length || 0) +
                            (sessionData.firstparty.tracking.length || 0) +
                            (sessionData.thirdparty.length || 0);
                        totalCookies += count;
                    }
                });

                return parseFloat((totalCookies / relevantSessions.length).toFixed(1));
            });
        });

        const browserColors: { [key: string]: string } = {
            'Chrome': '#FF6384',
            'Firefox': '#36A2EB',
            'Edge': '#FFCD56'
        };

        const datasets = browsers.map(browser => ({
            label: browser,
            data: dataByBrowser[browser],
            backgroundColor: browserColors[browser],
            // grouped bar chart by default in Chart.js, no stack needed
        }));

        this.chartInstance = new ChartJS(ctx, {
            type: 'bar',
            data: {
                labels: categories,
                datasets: datasets,
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    title: {
                        display: true,
                        text: 'Average Cookies per Session'
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                    },
                    // @ts-ignore
                    datalabels: {
                        display: true,
                        anchor: 'end',
                        align: 'top',
                        formatter: (value: number) => value,
                        font: {
                            weight: 'bold'
                        }
                    }
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
