import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terms of Service - OpenStock',
  description: 'Fair terms of service - built on trust, transparency, and community values',
};

export default function TermsPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-100 mb-4">Terms of Service</h1>
        <p className="text-gray-300 mb-4">
          Last updated: {new Date().toLocaleDateString()}
        </p>
        <div className="bg-green-900 border border-green-700 rounded-lg p-4">
          <p className="text-green-200 text-sm">
            🤝 <strong>Written in Plain English:</strong> No legal jargon here. These terms are designed to be fair,
            understandable, and aligned with our Open Dev Society values.
          </p>
        </div>
      </div>

      <div className="prose prose-lg max-w-none">
        {/* Our Approach */}
        <section className="mb-8 bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h2 className="text-2xl font-semibold text-gray-100 mb-4">🌟 Our Approach to Terms</h2>
          <p className="text-gray-200 mb-4">
            We believe terms of service should protect both users and creators without being exploitative.
            These terms reflect the Open Dev Society manifesto: open, fair, community-first.
          </p>
          <ul className="text-gray-200 space-y-2">
            <li>✅ <strong>No Gotchas:</strong> What you see is what you get</li>
            <li>✅ <strong>Community Input:</strong> These terms were reviewed by our community</li>
            <li>✅ <strong>Fair Use:</strong> Reasonable limits that protect everyone</li>
            <li>✅ <strong>Always Free Core:</strong> We promise core features stay free forever</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-100 mb-4">🎯 The Basics</h2>
          <p className="text-gray-200 mb-4">
            By using OpenStock, you're joining our community. Here's what that means:
          </p>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <ul className="text-gray-200 space-y-3">
              <li>💙 <strong>Respectful Use:</strong> Use OpenStock to learn, build, and grow - not to harm others</li>
              <li>🎓 <strong>Educational Focus:</strong> Perfect for students, personal projects, and learning</li>
              <li>🤝 <strong>Community Spirit:</strong> Help others when you can, ask for help when you need it</li>
              <li>🔓 <strong>Open Source Values:</strong> Contribute back when possible, share knowledge freely</li>
            </ul>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-100 mb-4">💰 Our Free Forever Promise</h2>
          <div className="bg-green-900 border border-green-700 rounded-lg p-6">
            <p className="text-green-200 font-medium mb-3">Core features of OpenStock will always be free:</p>
            <ul className="text-gray-200 space-y-2">
              <li>✅ Real-time stock data and charts</li>
              <li>✅ Personal watchlists and portfolio tracking</li>
              <li>✅ Basic market analysis tools</li>
              <li>✅ Community features and discussions</li>
              <li>✅ API access for personal projects</li>
            </ul>
            <p className="text-gray-300 text-sm mt-4 italic">
              This isn't a "freemium trap" - it's our commitment to making financial tools accessible to everyone.
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-100 mb-4">🛡️ Investment Disclaimer (The Important Stuff)</h2>
          <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-6">
            <p className="text-yellow-200 font-medium mb-2">Let's be crystal clear about this:</p>
            <div className="text-gray-200 space-y-3">
              <p>
                <strong>OpenStock is an educational and analysis tool, not investment advice.</strong>
                We provide data and tools to help you make informed decisions, but the decisions are yours.
              </p>
              <p>
                <strong>We're not financial advisors.</strong> We're developers and community members who built
                tools we wished existed when we were learning about investing.
              </p>
              <p>
                <strong>Always do your own research.</strong> Use multiple sources, consult professionals,
                and never invest more than you can afford to lose.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-100 mb-4">👥 Your Account & Responsibilities</h2>
          <p className="text-gray-200 mb-4">
            We trust you to be a good community member. Here's what we ask:
          </p>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-blue-900 border border-blue-700 rounded-lg p-4">
              <h3 className="font-semibold text-blue-200 mb-2">✨ What We'd Love</h3>
              <ul className="text-blue-200 text-sm space-y-1">
                <li>• Share knowledge with other users</li>
                <li>• Report bugs and suggest improvements</li>
                <li>• Keep your account information current</li>
                <li>• Use the platform to learn and grow</li>
              </ul>
            </div>
            <div className="bg-red-900 border border-red-700 rounded-lg p-4">
              <h3 className="font-semibold text-red-200 mb-2">❌ What Hurts Everyone</h3>
              <ul className="text-red-200 text-sm space-y-1">
                <li>• Sharing accounts or API keys</li>
                <li>• Trying to break or exploit the system</li>
                <li>• Harassing other community members</li>
                <li>• Using the platform for illegal activities</li>
              </ul>
            </div>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-100 mb-4">📊 Data & Content</h2>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <p className="text-gray-200 mb-4">
              <strong>Your data belongs to you.</strong> We provide tools to export everything anytime.
              We'll never claim ownership of your watchlists, notes, or personal information.
            </p>
            <p className="text-gray-200 mb-4">
              <strong>Market data comes from licensed sources.</strong> While we provide it for free,
              please respect that it's meant for personal use and learning.
            </p>
            <p className="text-gray-200">
              <strong>Community contributions are appreciated.</strong> If you share insights or contribute
              to discussions, you're helping build a knowledge commons for everyone.
            </p>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-100 mb-4">🔧 Service Availability</h2>
          <p className="text-gray-200 mb-4">
            We're committed to keeping OpenStock running, but we're also realistic:
          </p>
          <ul className="text-gray-200 space-y-2 ml-6">
            <li>• We aim for 99.9% uptime, but stuff happens (we're human!)</li>
            <li>• We'll give advance notice for planned maintenance</li>
            <li>• Major outages will be communicated on our status page and Discord</li>
            <li>• We're building sustainable infrastructure, not just cheap hosting</li>
          </ul>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-100 mb-4">🔄 Changes to These Terms</h2>
          <div className="bg-purple-900 border border-purple-700 rounded-lg p-6">
            <p className="text-purple-200 mb-3">
              <strong>We believe in transparency for terms changes too:</strong>
            </p>
            <ul className="text-gray-200 space-y-2">
              <li>• Community discussion on proposed changes</li>
              <li>• Clear explanation of what's changing and why</li>
              <li>• Version history available on GitHub</li>
            </ul>
          </div>
        </section>

        <section className="mb-8">
          <h2 className="text-2xl font-semibold text-gray-100 mb-4">🤔 Questions or Concerns?</h2>
          <p className="text-gray-200 mb-4">
            Legal documents shouldn't be mysterious. If anything here confuses you or seems unfair,
            let's talk about it.
          </p>
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <p className="text-gray-200 mb-2">
              <strong>Legal Questions:</strong>{' '}
              <a href="mailto:legal@opendevsociety.org" className="text-blue-400 hover:text-blue-300">
                opendevsociety@cc.cc
              </a>
            </p>
            <p className="text-gray-200">
              <strong>General Discussion:</strong> Join our Discord #community channel
            </p>
          </div>
        </section>

        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 text-center">
          <h3 className="text-xl font-semibold text-gray-100 mb-3">The Open Dev Society Way</h3>
          <p className="text-gray-200 mb-2">
            "We build tools that empower people, create knowledge that's free for all,
            and foster communities where everyone can grow."
          </p>
          <p className="text-gray-300 text-sm">
            These terms reflect those values. Thanks for being part of our community. 🚀
          </p>
        </div>
      </div>
    </div>
  );
}
