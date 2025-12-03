-- CONFIG
CREATE TABLE config (
    id SERIAL PRIMARY KEY,
    browser VARCHAR(20) CHECK (browser IN ('chrome', 'firefox', 'brave')),
    cookies VARCHAR(10) CHECK (cookies IN ('yes', 'no', 'opt')),
    js BOOLEAN NOT NULL,
    ad_blocker BOOLEAN NOT NULL
);

-- SESSION
CREATE TABLE session (
    id SERIAL PRIMARY KEY,
    url TEXT NOT NULL,
    category VARCHAR(50),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    config_id INTEGER REFERENCES config(id)
);

-- COOKIES
CREATE TABLE cookies (
    id SERIAL PRIMARY KEY,
    session_id INTEGER REFERENCES session(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    value TEXT,
    domain VARCHAR(255),
    path VARCHAR(500),
    size INTEGER,
    http_only BOOLEAN,
    same_site BOOLEAN,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expiration_at TIMESTAMP,
    location VARCHAR(20) CHECK (
        location IN ('cookie', 'indexDB', 'localStorage')
    )
);

-- SEED: CONFIG
INSERT INTO
    config (browser, cookies, js, ad_blocker)
VALUES
    ('chrome', 'yes', true, false),
    ('firefox', 'opt', true, true),
    ('brave', 'no', true, true);

-- SEED: SESSION
INSERT INTO
    session (url, category, config_id)
VALUES
    ('https://example.com', 'test', 1),
    ('https://heise.de', 'news', 2),
    ('https://github.com', 'dev', 3);

-- SEED: COOKIES
INSERT INTO
    cookies (
        session_id,
        name,
        value,
        domain,
        path,
        size,
        http_only,
        same_site,
        created_at,
        expiration_at,
        location
    )
VALUES
    (
        1,
        'sessionid',
        'abc123',
        'example.com',
        '/',
        64,
        true,
        true,
        NOW(),
        NOW() + INTERVAL '1 day',
        'cookie'
    ),
    (
        2,
        'heise_pref',
        'darkmode=1',
        'heise.de',
        '/',
        32,
        false,
        false,
        NOW(),
        NOW() + INTERVAL '30 days',
        'localStorage'
    ),
    (
        3,
        'gh_user',
        'chris',
        'github.com',
        '/',
        48,
        true,
        true,
        NOW(),
        NOW() + INTERVAL '7 days',
        'cookie'
    );