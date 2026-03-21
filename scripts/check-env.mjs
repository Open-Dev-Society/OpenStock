#!/usr/bin/env node

/**
 * Environment Variables Checker
 * Run: node scripts/check-env.mjs
 */

const requiredVars = {
    // Core
    'NODE_ENV': 'development or production',
    
    // Database
    'MONGODB_URI': 'MongoDB connection string',
    
    // Better Auth
    'BETTER_AUTH_SECRET': 'Secret key for Better Auth',
    'BETTER_AUTH_URL': 'Auth URL (e.g., http://localhost:3000)',
    
    // Finnhub
    'NEXT_PUBLIC_FINNHUB_API_KEY': 'Finnhub API key (public)',
    'FINNHUB_BASE_URL': 'Finnhub API base URL',
    
    // Inngest
    'GEMINI_API_KEY': 'Google Gemini API key',
    'INNGEST_SIGNING_KEY': 'Inngest signing key (for Vercel)',
    
    // Email
    'NODEMAILER_EMAIL': 'Gmail address for sending emails',
    'NODEMAILER_PASSWORD': 'Gmail app password (not regular password)',
};

const optionalVars = {
    'FINNHUB_API_KEY': 'Legacy Finnhub key (deprecated, use NEXT_PUBLIC_FINNHUB_API_KEY)',
};

console.log('🔍 Checking Environment Variables...\n');
console.log('='.repeat(60));

let missing = [];
let present = [];
let warnings = [];

// Check required variables
for (const [key, description] of Object.entries(requiredVars)) {
    const value = process.env[key];
    if (!value || value.trim() === '') {
        missing.push({ key, description });
    } else {
        present.push({ key, description, value: maskValue(value) });
    }
}

// Check optional variables
for (const [key, description] of Object.entries(optionalVars)) {
    const value = process.env[key];
    if (value) {
        warnings.push({ key, description, message: 'This variable is deprecated or optional' });
    }
}

// Display results
console.log('\n✅ Present Variables:');
console.log('-'.repeat(60));
if (present.length === 0) {
    console.log('  None found');
} else {
    present.forEach(({ key, description, value }) => {
        console.log(`  ✓ ${key}`);
        console.log(`    ${description}`);
        console.log(`    Value: ${value}\n`);
    });
}

if (missing.length > 0) {
    console.log('\n❌ Missing Variables:');
    console.log('-'.repeat(60));
    missing.forEach(({ key, description }) => {
        console.log(`  ✗ ${key}`);
        console.log(`    ${description}\n`);
    });
}

if (warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    console.log('-'.repeat(60));
    warnings.forEach(({ key, message }) => {
        console.log(`  ⚠ ${key}: ${message}\n`);
    });
}

// Summary
console.log('\n' + '='.repeat(60));
console.log(`Summary: ${present.length}/${Object.keys(requiredVars).length} required variables present`);
if (missing.length > 0) {
    console.log(`\n⚠️  Missing ${missing.length} required variable(s).`);
    console.log('\nTo fix:');
    console.log('1. Create a .env file in the project root');
    console.log('2. Add the missing variables');
    console.log('3. For Vercel: Add these in Project Settings > Environment Variables');
    process.exit(1);
} else {
    console.log('\n✅ All required environment variables are set!');
}

// Helper function to mask sensitive values
function maskValue(value) {
    if (value.length <= 8) {
        return '***';
    }
    return value.substring(0, 4) + '***' + value.substring(value.length - 4);
}

