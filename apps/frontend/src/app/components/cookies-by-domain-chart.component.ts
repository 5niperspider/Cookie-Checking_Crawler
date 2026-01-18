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
    styles: [
        `
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
        `,
    ],
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

    ngOnChanges(): void {
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

        this.canvasRefs.forEach((canvasRef, configIndex) => {
            const targetConfigValue = this.configValues[configIndex];

            // Filtere Sessions nach cookieBannerHandled Wert
            const filteredSessions = this.sessions.filter(
                s => s.cookieBannerHandled === targetConfigValue
            );

            if (!filteredSessions || filteredSessions.length === 0) {
                const ctx = canvasRef.nativeElement.getContext('2d');
                if (ctx) {
                    this.chartInstances.push(
                        new ChartJS(ctx, {
                            type: 'bar',
                            data: { labels: [], datasets: [] },
                            options: { responsive: true, maintainAspectRatio: false }
                        })
                    );
                }
                return;
            }

            // Gruppiere Sessions nach URL
            const urlToSessionsMap = new Map<string, CrawlSession[]>();
            filteredSessions.forEach(session => {
                if (session.url) {
                    if (!urlToSessionsMap.has(session.url)) {
                        urlToSessionsMap.set(session.url, []);
                    }
                    urlToSessionsMap.get(session.url)!.push(session);
                }
            });

            const sortedUrls = Array.from(urlToSessionsMap.keys()).sort().slice(0, 10);

            // Browser Config
            const browsers = ['chrome', 'firefox', 'brave'] as const;
            const browserLabels: Record<typeof browsers[number], string> = {
                'chrome': 'Chrome',
                'firefox': 'Firefox',
                'brave': 'Brave'
            };
            const browserColors: Record<string, string> = {
                'Chrome': '#4285F4',
                'Firefox': '#FF7139',
                'Brave': '#FB542B'
            };

            // Precompute pro URL: total avg + browser-spezifische Ø cookies
            const urlMetadata = new Map<string, { 
                totalAvgCookies: number; 
                sessionCount: number;
                browserSessions: Record<string, number>;
                browserAvgs: Record<string, number>; // Ø cookies PRO BROWSER
            }>();
            
            const urlLabels: string[] = [];
            sortedUrls.forEach((url, index) => {
                const sessionsForUrl = urlToSessionsMap.get(url) || [];
                const browserSessions: Record<string, number> = { chrome: 0, firefox: 0, brave: 0 };
                const browserTotals: Record<string, number> = { chrome: 0, firefox: 0, brave: 0 };
                
                sessionsForUrl.forEach(session => {
                    const browserKey = session.browser || '';
                    browserSessions[browserKey] = (browserSessions[browserKey] || 0) + 1;
                    
                    const classified = this.analyticsData[session.id as unknown as number];
                    if (classified) {
                        const allCookies = [
                            ...classified.firstparty.tracking,
                            ...classified.firstparty.nontracking,
                            ...classified.thirdparty
                        ];
                        browserTotals[browserKey] += allCookies.length;
                    }
                });
                
                const totalAvgCookies = sessionsForUrl.length > 0 ? 
                    Object.values(browserTotals).reduce((a, b) => a + b, 0) / sessionsForUrl.length : 0;
                
                const browserAvgs: Record<string, number> = {};
                browsers.forEach(b => {
                    browserAvgs[b] = browserSessions[b] > 0 ? browserTotals[b] / browserSessions[b] : 0;
                });
                
                urlMetadata.set(url, { 
                    totalAvgCookies, 
                    sessionCount: sessionsForUrl.length, 
                    browserSessions, 
                    browserAvgs 
                });
                
                // Label
                try {
                    const urlObj = new URL(url);
                    urlLabels.push(urlObj.hostname.replace('www.', ''));
                } catch {
                    urlLabels.push(`U${index + 1}`);
                }
            });

            // Datasets: Farbanteil = (browser_Ø / SUMME_ALLER_browser_Øs) * totalAvg
            const datasets = browsers.map(browserKey => {
                const label = browserLabels[browserKey];
                const color = browserColors[label];

                const dataPoints: number[] = sortedUrls.map(url => {
                    const metadata = urlMetadata.get(url)!;
                    const sumAllBrowserAvgs = browsers.reduce((sum, b) => sum + metadata.browserAvgs[b], 0);
                    if (sumAllBrowserAvgs === 0) return 0;
                    return (metadata.browserAvgs[browserKey] / sumAllBrowserAvgs) * metadata.totalAvgCookies;
                });

                return {
                    label,
                    data: dataPoints,
                    backgroundColor: color,
                    stack: 'BrowserStack'
                };
            });

            const ctx = canvasRef.nativeElement.getContext('2d');
            if (!ctx) return;

            const chart = new ChartJS(ctx, {
                type: 'bar',
                data: {
                    labels: urlLabels,
                    datasets,
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'x',
                    layout: {
                        padding: {
                            top: 25
                        }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top'
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            backgroundColor: 'rgba(0, 0, 0, 0.8)',
                            padding: 12,
                            titleFont: {
                                size: 12,
                                weight: 'bold'
                            },
                            bodyFont: {
                                size: 11
                            },
                            callbacks: {
                                title: (context) => {
                                    if (context.length === 0) return '';
                                    const urlIndex = context[0].dataIndex;
                                    const url = sortedUrls[urlIndex];
                                    const metadata = urlMetadata.get(url)!;
                                    const siteLabel = urlLabels[urlIndex];
                                    const browserBreakdown = Object.entries(metadata.browserSessions)
                                        .filter(([, count]) => count > 0)
                                        .map(([b, count]) => `${browserLabels[b as keyof typeof browserLabels] || b}: ${count}`)
                                        .join('\n');
                                    return `📍 ${siteLabel}\nTotal Ø: ${metadata.totalAvgCookies.toFixed(1)} cookies\n${browserBreakdown}`;
                                },
                                label: (context) => {
                                    const browserKey = ['chrome', 'firefox', 'brave'][context.datasetIndex];
                                    const metadata = urlMetadata.get(sortedUrls[context.dataIndex])!;
                                    const browserAvg = metadata.browserAvgs[browserKey];
                                    const value = context.parsed.y;
                                    const sessions = metadata.browserSessions[browserKey];
                                    return `${context.dataset.label}: ${value?.toFixed(1)} (Ø ${browserAvg.toFixed(1)}, ${sessions} Sessions)`;
                                }
                            }
                        },
                        datalabels: {
                            display: false
                        } as Record<string, unknown>
                    },
                    scales: {
                        x: {
                            stacked: true,
                            title: {
                                display: true,
                                text: 'Websites',
                                font: {
                                    weight: 'bold'
                                }
                            },
                            ticks: {
                                maxRotation: 45,
                                minRotation: 0,
                                font: {
                                    size: 10
                                }
                            }
                        },
                        y: {
                            stacked: true,
                            beginAtZero: true,
                            title: {
                                display: true,
                                text: 'Ø Cookies pro Session',
                                font: {
                                    weight: 'bold'
                                }
                            },
                            ticks: {
                                stepSize: 1
                            }
                        },
                    },
                },
            });

            this.chartInstances.push(chart);
        });
    }
}
