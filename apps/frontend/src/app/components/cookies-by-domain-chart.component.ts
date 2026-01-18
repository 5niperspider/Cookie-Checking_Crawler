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

            console.log(`Chart ${configIndex} (${targetConfigValue}):`, filteredSessions.length, 'sessions filtered from', this.sessions.length);

            if (!filteredSessions || filteredSessions.length === 0) {
                // Leeres Chart für diese Config
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
                    const sessions = urlToSessionsMap.get(session.url);
                    if (sessions) {
                        sessions.push(session);
                    }
                }
            });

            // Sortiere URLs
            const sortedUrls = Array.from(urlToSessionsMap.keys()).sort();

            // Sammle Domains und berechne DURCHSCHNITT pro Domain pro URL
            const domainCookieAverages = new Map<string, Map<string, number>>();

            sortedUrls.forEach(url => {
                const sessionsForUrl = urlToSessionsMap.get(url) || [];
                const domainTotalMap = new Map<string, number>();
                const domainCountMap = new Map<string, number>();

                // Summe und Anzahl pro Domain für diese URL sammeln
                sessionsForUrl.forEach(session => {
                    const classified = this.analyticsData[session.id as unknown as number];
                    if (classified) {
                        const allCookies = [
                            ...classified.firstparty.tracking,
                            ...classified.firstparty.nontracking,
                            ...classified.thirdparty
                        ];

                        allCookies.forEach(cookie => {
                            const currentTotal = domainTotalMap.get(cookie.domain) || 0;
                            const currentCount = domainCountMap.get(cookie.domain) || 0;
                            domainTotalMap.set(cookie.domain, currentTotal + 1);
                            domainCountMap.set(cookie.domain, currentCount + 1);
                        });
                    }
                });

                // Berechne Durchschnitt pro Domain für diese URL
                const domainAvgMap = new Map<string, number>();
                domainTotalMap.forEach((total, domain) => {
                    const avg = total / sessionsForUrl.length;
                    domainAvgMap.set(domain, avg);
                });

                domainCookieAverages.set(url, domainAvgMap);
            });

            // Sammle alle Domains
            const allDomains = new Set<string>();
            domainCookieAverages.forEach(domainMap => {
                domainMap.forEach((_, domain) => allDomains.add(domain));
            });

            const domains = Array.from(allDomains).slice(0, 10).sort(); // Top 10 Domains

            // Erstelle Datasets pro Domain mit Durchschnittswerten
            const colors = ['#FF6384', '#36A2EB', '#FFCD56', '#4BC0C0', '#9966FF', '#FF9999', '#FFCC99', '#99CCFF', '#CCCCCC', '#FF99CC'];
            const datasets = domains.map((domain, domainIndex) => {
                const dataPoints = sortedUrls.map(url => {
                    const domainMap = domainCookieAverages.get(url);
                    return domainMap?.get(domain) || 0;
                });

                return {
                    label: domain,
                    data: dataPoints,
                    backgroundColor: colors[domainIndex % colors.length],
                };
            });

            const ctx = canvasRef.nativeElement.getContext('2d');
            if (!ctx) return;

            // Erstelle URL-Labels und speichere Metadaten für Tooltips
            const urlMetadata = new Map<string, { avgCookies: number; sessionCount: number }>();
            
            const urlLabels = sortedUrls.map((url, i) => {
                try {
                    const urlObj = new URL(url);
                    const hostname = urlObj.hostname.replace('www.', '');
                    const sessionsForUrl = urlToSessionsMap.get(url) || [];
                    let totalCookies = 0;
                    
                    sessionsForUrl.forEach(session => {
                        const classified = this.analyticsData[session.id as unknown as number];
                        if (classified) {
                            const allCookies = [
                                ...classified.firstparty.tracking,
                                ...classified.firstparty.nontracking,
                                ...classified.thirdparty
                            ];
                            totalCookies += allCookies.length;
                        }
                    });
                    
                    const avgCookies = sessionsForUrl.length > 0 ? totalCookies / sessionsForUrl.length : 0;
                    urlMetadata.set(url, { avgCookies, sessionCount: sessionsForUrl.length });
                    return hostname;
                } catch {
                    const sessionsForUrl = urlToSessionsMap.get(url) || [];
                    let totalCookies = 0;
                    
                    sessionsForUrl.forEach(session => {
                        const classified = this.analyticsData[session.id as unknown as number];
                        if (classified) {
                            const allCookies = [
                                ...classified.firstparty.tracking,
                                ...classified.firstparty.nontracking,
                                ...classified.thirdparty
                            ];
                            totalCookies += allCookies.length;
                        }
                    });
                    
                    const avgCookies = sessionsForUrl.length > 0 ? totalCookies / sessionsForUrl.length : 0;
                    urlMetadata.set(url, { avgCookies, sessionCount: sessionsForUrl.length });
                    return `U${i + 1}`;
                }
            });

            const chart = new ChartJS(ctx, {
                type: 'bar',
                data: {
                    labels: urlLabels,
                    datasets: datasets,
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
                            display: false
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
                                    const metadata = urlMetadata.get(url);
                                    const label = context[0]?.label || '';
                                    const sessionCount = metadata?.sessionCount || 0;
                                    const avgCookies = metadata?.avgCookies?.toFixed(1) || '0';
                                    return `📍 ${label}\n${sessionCount} ${sessionCount === 1 ? 'Session' : 'Sessions'} | Ø ${avgCookies} cookies`;
                                },
                                label: () => '',
                                footer: (context) => {
                                    if (context.length > 0) {
                                        const total = context.reduce((sum, ctx) => sum + (ctx.parsed.y || 0), 0);
                                        return `Total: ${total} cookies`;
                                    }
                                    return '';
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
                                text: 'Websites (Sessions)',
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
                                text: 'Cookie Count',
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
