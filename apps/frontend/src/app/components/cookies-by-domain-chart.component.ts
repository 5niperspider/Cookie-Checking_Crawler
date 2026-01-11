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
interface NestedCookieData {
    nontrakking: any[];
    trakking: any[];
}

interface BrowserData {
    firstparty: NestedCookieData;
    thirdparty: any[];
}

interface SessionData {
    [browserName: string]: BrowserData;
}

interface DummyGroup {
    category: string;
    sessions: {
        [url: string]: SessionData;
    };
}

const generateDummyData = (): DummyGroup[] => {
    const categories = ['Ab', 'Ak', 'Opt'];
    const browsers = ['Chrome', 'Firefox', 'Edge'];
    const groups: DummyGroup[] = categories.map(c => ({ category: c, sessions: {} }));

    for (let i = 1; i <= 100; i++) {
        const url = `session-url-${i}.com`;
        // Distribute sessions across categories (round-robin or random)
        const categoryIndex = (i - 1) % 3; // 0, 1, 2

        const sessionData: SessionData = {};

        browsers.forEach(browser => {
            // Random counts
            const ntCount = Math.floor(Math.random() * 20); // 0-19 cookies
            const tCount = Math.floor(Math.random() * 10);
            const tpCount = Math.floor(Math.random() * 15);

            sessionData[browser] = {
                firstparty: {
                    nontrakking: Array(ntCount).fill(1),
                    trakking: Array(tCount).fill(1)
                },
                thirdparty: Array(tpCount).fill(1)
            };
        });

        groups[categoryIndex].sessions[url] = sessionData;
    }

    return groups;
};

const DUMMY_DATA: DummyGroup[] = generateDummyData();

@Component({
    selector: 'app-cookies-by-domain-chart',
    standalone: true,
    imports: [CommonModule],
    template: `
        <div class="charts-row">
            <div class="chart-wrapper" *ngFor="let group of dummyData; let i = index">
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
            .charts-row {
                display: flex;
                flex-direction: row;
                gap: 20px;
                overflow-x: auto; /* Allow whole row to scroll if needed on small screens */
                padding-bottom: 20px;
            }
            .chart-wrapper {
                flex: 1;
                min-width: 300px; /* Minimum width per chart panel */
                border: 1px solid #ddd;
                padding: 10px;
                border-radius: 8px;
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
    @Input() stats?: CookieStats;

    public dummyData = DUMMY_DATA;
    private chartInstances: ChartJS[] = [];

    ngOnInit() {
        // nothing needed here
    }

    ngAfterViewInit(): void {
        this.renderCharts();
    }

    ngOnChanges(): void {
        this.renderCharts();
    }

    getMinWidth(group: DummyGroup): number {
        const sessionCount = Object.keys(group.sessions).length;
        // Make sure there is enough space. 30px per session minimum.
        return Math.max(800, sessionCount * 40);
    }

    private renderCharts() {
        if (!this.canvasRefs) return;

        this.chartInstances.forEach(c => c.destroy());
        this.chartInstances = [];

        this.canvasRefs.forEach((canvasRef, index) => {
            const group = this.dummyData[index];
            if (!group) return;

            const ctx = canvasRef.nativeElement.getContext('2d');
            if (!ctx) return;

            const urls = Object.keys(group.sessions);
            const browsers = ['Chrome', 'Firefox', 'Edge'];

            const browserColors: { [key: string]: string } = {
                'Chrome': '#FF6384',
                'Firefox': '#36A2EB',
                'Edge': '#FFCD56'
            };

            const datasets = browsers.map(browser => {
                const dataPoints = urls.map(url => {
                    const sessionData = group.sessions[url];
                    const browserData = sessionData[browser];
                    return (browserData.firstparty.nontrakking.length || 0) +
                        (browserData.firstparty.trakking.length || 0) +
                        (browserData.thirdparty.length || 0);
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
                            display: false
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
                                return context.datasetIndex === datasets.length - 1;
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
                                minRotation: 90
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
}
