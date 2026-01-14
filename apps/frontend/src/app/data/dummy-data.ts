
export interface NestedCookieData {
    nontrakking: any[];
    trakking: any[];
}

export interface BrowserData {
    firstparty: NestedCookieData;
    thirdparty: any[];
}

export interface SessionData {
    [browserName: string]: BrowserData;
}

export interface DummyGroup {
    category: string;
    sessions: {
        [url: string]: SessionData;
    };
}

export const generateDummyData = (): DummyGroup[] => {
    const categories = ['Ablehnen', 'Akzeptieren', 'Optional'];
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

export const DUMMY_DATA: DummyGroup[] = generateDummyData();
