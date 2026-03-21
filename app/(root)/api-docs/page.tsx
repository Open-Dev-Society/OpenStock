import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'API Documentation - OpenStock',
  description: 'Free and open API documentation for OpenStock platform - no paywalls, no barriers',
};

export default function ApiDocsPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-gray-200 mb-4">Free & Open API Documentation</h1>
        <p className="text-xl text-gray-200 mb-4">
          Complete guide to integrating with the OpenStock API - completely free, forever
        </p>
        <div className="bg-blue-300 border border-blue-400 rounded-lg p-4">
          <p className="text-black text-sm">
            💡 <strong>Open Dev Society Promise:</strong> This API will always be free. No hidden costs, no usage limits for personal projects, no barriers to knowledge.
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Philosophy */}
        <section className="bg-gray-800 rounded-lg shadow-sm p-6 border">
          <h2 className="text-2xl font-semibold text-gray-100 mb-4">🌍 Our API Philosophy</h2>
          <p className="text-gray-200 mb-4">
            We believe market data should be accessible to everyone - students building their first portfolio tracker,
            developers creating tools for their community, and anyone who wants to learn about finance without barriers.
          </p>
          <ul className="text-gray-200 space-y-2">
            <li>✅ <strong>Always Free:</strong> Core features remain free forever</li>
            <li>✅ <strong>No Gatekeeping:</strong> Simple authentication, clear documentation</li>
            <li>✅ <strong>Community First:</strong> Built for learners, students, and builders</li>
            <li>✅ <strong>Open Source:</strong> API examples and SDKs are open source</li>
          </ul>
        </section>

        {/* Community Support */}
        <section className="bg-gray-800 rounded-lg shadow-sm p-6 border">
          <h2 className="text-2xl font-semibold text-gray-100 mb-4">🤝 Community & Support</h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="bg-green-200 p-4 rounded-lg">
              <h3 className="font-semibold text-black mb-2">🎓 For Students</h3>
              <p className="text-gray-800 text-sm">
                Building a project for class? Email us at <strong>opendevsociety@cc.cc</strong> for unlimited access and mentorship.
              </p>
            </div>
            <div className="bg-blue-300 p-4 rounded-lg">
              <h3 className="font-semibold text-black mb-2">💻 For Developers</h3>
              <p className="text-gray-800 text-sm">
                Join our Discord community for code examples, troubleshooting, and collaboration opportunities.
              </p>
            </div>
          </div>
        </section>

        {/* Open Source Commitment */}
        <section className="bg-gray-800 rounded-lg p-6 border">
          <h2 className="text-2xl font-semibold text-gray-200 mb-4">🔓 Open Source Promise</h2>
          <p className="text-gray-200 mb-4">
            This API, its documentation, and all example code are open source.
            Found a bug? Want a feature? Submit a PR or issue on GitHub.
          </p>
          <div className="flex space-x-4">
            <a target="_blank" href="https://github.com/Open-Dev-Society/"
               className="bg-gray-200 text-gray-800 px-4 py-2 rounded hover:bg-gray-300 transition-colors">
              Contact us
            </a>

          </div>
        </section>
      </div>
    </div>
  );
}
