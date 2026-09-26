#!/usr/bin/env node

/**
 * Environment Variables Checker
 * Run: node scripts/check-env.mjs
 *
 * Checks your .env file against the requirements for OpenStock.
 * Provides detailed feedback on missing, present, and deprecated variables,
 * along with guidance on how to fix common issues.
 */

// =============================================
// VARIABLE CATEGORIES
// =============================================

/**
 * REQUIRED: Must be set for the app to function.
 * These will cause the script to exit with code 1 if missing.
 */
const requiredVars = {
    // Core
    'NODE_ENV': 'development, production, or test',

    // Database (MongoDB Atlas or local Docker)
    'MONGODB_URI': 'MongoDB connection string (Atlas: mongodb+srv://... | Docker: mongodb://root:example@mongodb:27017/openstock?authSource=admin)',

    // Better Auth
    'BETTER_AUTH_SECRET': 'Secret key for Better Auth (generate with: openssl rand -hex 32)',
    'BETTER_AUTH_URL': 'Auth URL (e.g., http://localhost:3000 or https://your-domain.com)',

    // Finnhub (Market data - required for stock features)
    'NEXT_PUBLIC_FINNHUB_API_KEY': 'Finnhub API key (free tier available at finnhub.io)',
    'FINNHUB_BASE_URL': 'Finnhub API base URL (default: https://finnhub.io/api/v1)',

    // Inngest (Background jobs, cron, AI)
    'INNGEST_SIGNING_KEY': 'Inngest signing key (required for Vercel deployment; get from Inngest dashboard)',
    'INNGEST_EVENT_KEY': 'Inngest event key (required in production: sign-up sends the welcome-email event with it)',

};

/**
 * OPTIONAL: Can be set but not required for basic functionality.
 * These are checked and reported but won't cause failure.
 */
const optionalVars = {
    // Email (Nodemailer via Gmail). Without it the app runs; welcome and news emails are disabled.
    'NODEMAILER_EMAIL': 'Gmail address for sending emails',
    'NODEMAILER_PASSWORD': 'Gmail app password (use App Passwords if 2FA enabled; not your regular password)',

    // AI Providers (for Inngest workflows)
    'GEMINI_API_KEY': 'Google Gemini API key (for AI-powered welcome emails and news summaries)',

    // Adanos sentiment insights (optional alternative data source)
    'ADANOS_API_KEY': 'Adanos API key for stock sentiment insights (Reddit, X.com, news, Polymarket)',
    'ADANOS_API_BASE_URL': 'Adanos API base URL override (default: https://api.adanos.org)',

    // MiniMax (optional AI provider fallback)
    'MINIMAX_API_KEY': 'MiniMax API key (used when AI_PROVIDER=minimax or as fallback)',

    // Kit (ConvertKit) for email broadcasts
    'KIT_API_KEY': 'ConvertKit API key (for news summary broadcasts)',
    'KIT_API_SECRET': 'ConvertKit API secret (for news summary broadcasts)',

    // Market data freshness + key pool
    'FINNHUB_API_KEYS': 'Comma-separated Finnhub keys, rotated per request (each adds 60 req/min). Falls back to NEXT_PUBLIC_FINNHUB_API_KEY',
    'NEXT_PUBLIC_OPENSTOCK_DATA_MODE': '"cached" (default: quotes refresh hourly, shared by everyone) or "realtime" (every 15s; OpenStock Cloud / self-hosted)',

    // Social sign-in (Better Auth)
    'GOOGLE_CLIENT_ID': 'Google OAuth client ID (callback: <BETTER_AUTH_URL>/api/auth/callback/google)',
    'GOOGLE_CLIENT_SECRET': 'Google OAuth client secret',
    'GITHUB_CLIENT_ID': 'GitHub OAuth app client ID (callback: <BETTER_AUTH_URL>/api/auth/callback/github)',
    'GITHUB_CLIENT_SECRET': 'GitHub OAuth app client secret',

    // AI Provider selection (defaults to "gemini")
    'AI_PROVIDER': 'AI provider: "gemini" | "minimax" | "siray" (default: "gemini")',
};

/**
 * DEPRECATED: Still supported but prefer the new name.
 * Warns if these are set so you can migrate away.
 */
const deprecatedVars = {
    // Legacy Finnhub key (deprecated in favor of NEXT_PUBLIC_FINNHUB_API_KEY)
    'FINNHUB_API_KEY': 'Legacy Finnhub key - use NEXT_PUBLIC_FINNHUB_API_KEY instead',
};

// =============================================
// STATE TRACKING
// =============================================

const state = {
    present: [],
    missing: [],
    warnings: [],
    optionalPresent: [],
};

// Helper to classify a variable
function classifyVar(key) {
    if (requiredVars[key] !== undefined) return 'required';
    if (optionalVars[key] !== undefined) return 'optional';
    if (deprecatedVars[key] !== undefined) return 'deprecated';
    return 'unknown';
}

// =============================================
// MASKING HELPER
// =============================================

/**
 * Masks sensitive values for display.
 * Shows first 4 chars and last 4 chars, with *** in middle.
 * For very short values, shows *** entirely.
 */
function maskValue(value) {
    if (value.length <= 4) {
        return '****';
    }
    return value.substring(0, 4) + '***' + value.substring(value.length - 4);
}

// =============================================
// CHECK ALL VARIABLES
// =============================================

console.log('🔍 Checking Environment Variables...\n');
console.log('='.repeat(70));

// 1. Check required variables
for (const [key, description] of Object.entries(requiredVars)) {
    const value = process.env[key];
    const trimmed = value ? value.trim() : '';

    if (!trimmed) {
        state.missing.push({
            key,
            description,
            severity: 'critical',
            hint: getHint(key, 'required'),
        });
    } else {
        state.present.push({
            key,
            description,
            value: maskValue(trimmed),
            category: 'required',
        });
    }
}

// 2. Check deprecated variables
for (const [key, description] of Object.entries(deprecatedVars)) {
    const value = process.env[key];
    if (value && value.trim()) {
        state.warnings.push({
            key,
            description,
            message: 'This variable is deprecated. Please use the recommended alternative.',
        });
    }
}

// 3. Check optional variables
for (const [key, description] of Object.entries(optionalVars)) {
    const value = process.env[key];
    if (value && value.trim()) {
        state.optionalPresent.push({
            key,
            description,
            value: maskValue(value.trim()),
        });
    }
}

// =============================================
// DISPLAY RESULTS
// =============================================

// Helper function to get hint for missing vars
function getHint(key, type) {
    const hints = {
        'NODE_ENV': 'Set to "development", "production", or "test"',
        'MONGODB_URI': 'Use Atlas URI (mongodb+srv://...) or Docker connection string',
        'BETTER_AUTH_SECRET': 'Generate with: openssl rand -hex 32',
        'BETTER_AUTH_URL': 'e.g., http://localhost:3000 or https://your-domain.com',
        'NEXT_PUBLIC_FINNHUB_API_KEY': 'Get free key at finnhub.io → Dashboard → API',
        'FINNHUB_BASE_URL': 'Usually default is fine: https://finnhub.io/api/v1',
        'INNGEST_SIGNING_KEY': 'Get from Inngest dashboard → Env settings → Keys',
        'NODEMAILER_EMAIL': 'Your Gmail address',
        'NODEMAILER_PASSWORD': 'Generate Gmail App Password: myaccount.google.com → Security → App passwords',
    };
    return hints[key] || 'Check the OpenStock API_DOCS.md for setup instructions';
}

// Display Present Required Variables
console.log('\n✅ Present Required Variables:');
console.log('-'.repeat(70));
if (state.present.length === 0) {
    console.log('  None found');
} else {
    state.present.forEach(({ key, description, value }) => {
        console.log(`  ✓ ${key}`);
        console.log(`    ${description}`);
        console.log(`    Value: ${value}`);
    });
}

// Display Missing Required Variables
if (state.missing.length > 0) {
    console.log('\n❌ Missing Required Variables:');
    console.log('-'.repeat(70));
    state.missing.forEach(({ key, description, severity, hint }) => {
        console.log(`  ✗ ${key}`);
        console.log(`    ${description}`);
        console.log(`    ⚠ ${hint}`);
    });
}

// Display Deprecated Variables Warnings
if (state.warnings.length > 0) {
    console.log('\n⚠️  Deprecated Variables:');
    console.log('-'.repeat(70));
    state.warnings.forEach(({ key, description, message }) => {
        console.log(`  ⚠ ${key}`);
        console.log(`    ${description}`);
        console.log(`    ${message}`);
    });
}

// Display Present Optional Variables
console.log('\n📦 Present Optional Variables:');
console.log('-'.repeat(70));
if (state.optionalPresent.length === 0) {
    console.log('  None found (features will work without these)');
} else {
    state.optionalPresent.forEach(({ key, description, value }) => {
        console.log(`  ✓ ${key}`);
        console.log(`    ${description}`);
        console.log(`    Value: ${value}`);
    });
}

// =============================================
// SUMMARY AND EXIT CODE
// =============================================

console.log('\n' + '='.repeat(70));
const criticalMissing = state.missing.filter(m => m.severity === 'critical').length;
const totalRequired = Object.keys(requiredVars).length;
const presentRequired = state.present.length;

console.log(`Summary: ${presentRequired}/${totalRequired} required variables present`);
console.log(`Optional variables: ${state.optionalPresent.length}/${Object.keys(optionalVars).length} enabled`);

if (criticalMissing > 0) {
    console.log(`\n⚠️  ${criticalMissing} critical variable(s) are missing.`);
    console.log('\nTo fix:');
    console.log('1. Create a .env file in the project root (copy from .env.example)');
    console.log('2. Add the missing variables listed above');
    console.log('3. Refer to API_DOCS.md for each variable\'s source and setup instructions');
    console.log('4. For Vercel: Add these in Project Settings > Environment Variables');
    process.exit(1);
} else {
    console.log('\n✅ All required environment variables are set!');
    console.log('   Optional integrations are available if configured.');
    process.exit(0);
}
