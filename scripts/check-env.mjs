#!/usr/bin/env node

/**
 * Environment Variables Checker
 * Run: node scripts/check-env.mjs
 *
 * Checks your .env file against the requirements for OpenStock.
 * Provides detailed feedback on missing, present, and deprecated variables,
 * along with guidance on how to fix common issues.
 */

import 'dotenv/config';

// =============================================
// VARIABLE CATEGORIES
// =============================================

/**
 * REQUIRED: Must be set for the app to function.
 * These will cause the script to exit with code 1 if missing.
 */
const requiredVars = {
    // Database (MongoDB Atlas or local Docker)
    'MONGODB_URI': 'MongoDB connection string (Atlas: mongodb+srv://... | Docker: mongodb://root:example@mongodb:27017/openstock?authSource=admin)',

    // Better Auth
    'BETTER_AUTH_SECRET': 'Secret key for Better Auth (generate with: openssl rand -hex 32)',
    'BETTER_AUTH_URL': 'Auth URL (e.g., http://localhost:3000 or https://your-domain.com)',

};

// The Finnhub key can be set under any of these names (checked separately below)
const finnhubKeyNames = ['FINNHUB_API_KEYS', 'FINNHUB_API_KEY', 'NEXT_PUBLIC_FINNHUB_API_KEY'];

/**
 * OPTIONAL: Can be set but not required for basic functionality.
 * These are checked and reported but won't cause failure.
 */
const optionalVars = {
    // Inngest (background jobs). Optional locally with `npx inngest-cli dev`; required in production.
    'INNGEST_SIGNING_KEY': 'Inngest signing key (production; from the Inngest dashboard)',
    'INNGEST_EVENT_KEY': 'Inngest event key (production: sign-up sends the welcome-email event with it)',

    // Email (Nodemailer via Gmail). Without it the app runs; welcome and news emails are disabled.
    'NODEMAILER_EMAIL': 'Gmail address for sending emails',
    'NODEMAILER_PASSWORD': 'Gmail app password (use App Passwords if 2FA enabled; not your regular password)',

    // AI Providers (for Inngest workflows)
    'GEMINI_API_KEY': 'Google Gemini API key (for AI-powered welcome emails and news summaries)',
    'GEMINI_MODEL': 'Gemini model override (default: gemini-2.5-flash-lite)',

    // Adanos sentiment insights (optional alternative data source)
    'ADANOS_API_KEY': 'Adanos API key for stock sentiment insights (Reddit, X.com, news, Polymarket)',
    'ADANOS_API_BASE_URL': 'Adanos API base URL override (default: https://api.adanos.org)',

    // MiniMax (optional AI provider fallback)
    'MINIMAX_API_KEY': 'MiniMax API key (used when AI_PROVIDER=minimax or as fallback)',
    'MINIMAX_MODEL': 'MiniMax model override (default: MiniMax-M3.1-Flash; alternative: MiniMax-M3)',
    'MINIMAX_BASE_URL': 'MiniMax API base URL override (default: https://api.minimax.io/v1)',
    'SIRAY_API_KEY': 'Siray.ai API key (used when AI_PROVIDER=siray or as fallback)',

    // Kit (ConvertKit) for email broadcasts
    'KIT_API_KEY': 'ConvertKit API key (for news summary broadcasts)',
    'KIT_API_SECRET': 'ConvertKit API secret (for news summary broadcasts)',
    'KIT_WELCOME_FORM_ID': 'Kit form new users are subscribed to',

    // Market data freshness (fixed at build time: rebuild after changing it)
    'NEXT_PUBLIC_OPENSTOCK_DATA_MODE': '"cached" (default: quotes refresh hourly, shared by everyone) or "realtime" (every 15s, with price alerts)',

    // Docker Compose only
    'MONGO_ROOT_PASSWORD': 'Root password for the Compose MongoDB (use the same one in MONGODB_URI)',

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
    'FINNHUB_BASE_URL': 'Not used: OpenStock always calls https://finnhub.io/api/v1. Safe to delete.',
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
            hint: getHint(key),
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

// 1b. A Finnhub key under any of its names
const finnhubKey = finnhubKeyNames.find((key) => process.env[key]?.trim());
if (finnhubKey) {
    state.present.push({ key: finnhubKey, description: 'Finnhub API key', value: maskValue(process.env[finnhubKey].trim()), category: 'required' });
} else {
    state.missing.push({ key: finnhubKeyNames.join(' or '), description: 'Finnhub API key (free at finnhub.io)', severity: 'critical', hint: 'Get a free key at finnhub.io → Dashboard → API, then set FINNHUB_API_KEY (or several, comma-separated, in FINNHUB_API_KEYS)' });
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
function getHint(key) {
    const hints = {
        'MONGODB_URI': 'Use Atlas URI (mongodb+srv://...) or Docker connection string',
        'BETTER_AUTH_SECRET': 'Generate with: openssl rand -hex 32',
        'BETTER_AUTH_URL': 'e.g., http://localhost:3000 or https://your-domain.com',
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
    state.missing.forEach(({ key, description, hint }) => {
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
