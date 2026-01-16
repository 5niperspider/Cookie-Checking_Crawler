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
    ('chrome', 'no', false, false),
    ('chrome', 'opt', false, false),
    ('chrome', 'yes', false, false),
    ('chrome', 'no', true, false),
    ('chrome', 'opt', true, false),
    ('chrome', 'yes', true, false),
    ('chrome', 'no', false, true),
    ('chrome', 'opt', false, true),
    ('chrome', 'yes', false, true),
    ('chrome', 'no', true, true),
    ('chrome', 'opt', true, true),
    ('chrome', 'yes', true, true),
    ('firefox', 'no', false, false),
    ('firefox', 'opt', false, false),
    ('firefox', 'yes', false, false),
    ('firefox', 'no', true, false),
    ('firefox', 'opt', true, false),
    ('firefox', 'yes', true, false),
    ('firefox', 'no', false, true),
    ('firefox', 'opt', false, true),
    ('firefox', 'yes', false, true),
    ('firefox', 'no', true, true),
    ('firefox', 'opt', true, true),
    ('firefox', 'yes', true, true),
    ('brave', 'no', false, false),
    ('brave', 'opt', false, false),
    ('brave', 'yes', false, false),
    ('brave', 'no', true, false),
    ('brave', 'opt', true, false),
    ('brave', 'yes', true, false),
    ('brave', 'no', false, true),
    ('brave', 'opt', false, true),
    ('brave', 'yes', false, true),
    ('brave', 'no', true, true),
    ('brave', 'opt', true, true),
    ('brave', 'yes', true, true);

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