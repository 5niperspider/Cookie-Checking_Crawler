import { Component, OnInit, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
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
import { DUMMY_DATA } from '../data/dummy-data';

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

    private chartInstance?: ChartJS;

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
        const browsers = ['Chrome', 'Firefox', 'Edge'];
        const categories = DUMMY_DATA.map(g => g.category); // ['Ablehnen', 'Akzeptieren', 'Optional']

        // Calculate Averages
        const dataByBrowser: { [browser: string]: number[] } = {};

        browsers.forEach(browser => {
            dataByBrowser[browser] = categories.map(category => {
                const group = DUMMY_DATA.find(g => g.category === category);
                if (!group) return 0;

                const sessionUrls = Object.keys(group.sessions);
                if (sessionUrls.length === 0) return 0;

                let totalCookies = 0;
                sessionUrls.forEach(url => {
                    const sessionData = group.sessions[url];
                    const browserData = sessionData[browser];
                    const count = (browserData.firstparty.nontrakking.length || 0) +
                        (browserData.firstparty.trakking.length || 0) +
                        (browserData.thirdparty.length || 0);
                    totalCookies += count;
                });

                // Return Average
                return parseFloat((totalCookies / sessionUrls.length).toFixed(1));
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
