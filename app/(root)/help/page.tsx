import { Metadata } from 'next';
// Removed unused lucide-react imports

export const metadata: Metadata = {
  title: 'Help Center - OpenStock',
  description: 'Free help and community support - no barriers, just guidance',
};

export default function HelpPage() {
  const faqs = [
    {
      question: "Is OpenStock really free forever?",
      answer: "Yes! We're part of the Open Dev Society, which means we'll never lock knowledge behind paywalls. Core features remain free always. We run on community donations and the belief that financial tools should be accessible to everyone."
    },
    {
      question: "I'm a student - can I use this for my projects?",
      answer: "Absolutely! That's exactly why we built this. Use it for school projects, learning, or building your portfolio. Need help? Our community loves mentoring students. Email student@opendevsociety.org for extra support."
    },
    {
      question: "How do I add stocks to my favorites?",
      answer: "Navigate to any stock page and click the star icon. You can also search using the search bar and add directly from results. Everything is designed to be intuitive - no complex tutorials needed."
    },
    {
      question: "Can I contribute to OpenStock?",
      answer: "We'd love that! OpenStock is open source and community-driven. Check our GitHub for issues marked 'good first issue' or 'help wanted'. Every contribution, no matter how small, makes a difference."
    },
    {
      question: "What if I find a bug or have a feature request?",
      answer: "Please tell us! Submit issues on GitHub, join our Discord, or email opendevsociety@gmail.com. We see every report as a chance to make the platform better for everyone."
    }
  ];

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold text-gray-100 mb-4">Community Help Center</h1>
        <p className="text-xl text-gray-200 mb-4">
          Free help, guided by community, powered by the belief that everyone deserves support
        </p>
        <div className="bg-green-300 border border-green-200 rounded-lg p-4 max-w-2xl mx-auto">
          <p className="text-black text-sm">
            🤝 <strong>Our Promise:</strong> Every question matters. Every beginner is welcomed. No exclusion, ever.
          </p>
        </div>
      </div>


      {/* Help Philosophy */}
      <div className="grid md:grid-cols-3 gap-6 mb-12">
        <div className="bg-gray-800 rounded-lg shadow-sm p-6 border hover:shadow-md transition-shadow">

          <h3 className="text-lg font-semibold text-blue-500 mb-2">Learn Together</h3>
          <p className="text-gray-200 text-sm">
            Every expert was once a beginner. Our guides are written by the community, for the community.
            No jargon, no assumptions about prior knowledge.
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg shadow-sm p-6 border hover:shadow-md transition-shadow">

          <h3 className="text-lg font-semibold text-green-500 mb-2">Community Support</h3>
          <p className="text-gray-200 text-sm">
            Real people helping real people. Our Discord community includes students, professionals,
            and mentors who genuinely want to help you succeed.
          </p>
        </div>

        <div className="bg-gray-800 rounded-lg shadow-sm p-6 border hover:shadow-md transition-shadow">

          <h3 className="text-lg font-semibold text-purple-500 mb-2">Built with Care</h3>
          <p className="text-gray-200 text-sm">
            Every feature is designed with accessibility and ease-of-use in mind.
            We believe powerful tools should be simple to use.
          </p>
        </div>
      </div>

      {/* Community FAQs */}
      <section className="mb-12">
        <h2 className="text-3xl font-bold text-gray-100 mb-8 text-center">Community Questions</h2>
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div key={index} className="bg-gray-800 rounded-lg shadow-sm p-6 border">
              <h3 className="text-lg font-semibold text-gray-100 mb-2">{faq.question}</h3>
              <p className="text-gray-200">{faq.answer}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Community Connection */}
      <section className="bg-gradient-to-r from-blue-200 to-purple-200 rounded-lg p-8 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">Join Our Community</h2>
        <p className="text-gray-700 mb-6">
          Don&apos;t struggle alone. Our community of builders, learners, and dreamers is here to help.
          Because we believe the future belongs to those who build it openly.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a
                href="https://discord.gg/jdJuEMvk"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-550 transition-colors text-center inline-block"
            >
                Join Discord Community
            </a>

            <a
                target="_blank"
                href="mailto:opendevsociety@gmail.com"
                className="bg-gray-800 text-gray-200 px-6 py-3 rounded-lg hover:bg-gray-900 transition-colors text-center inline-block"
            >
                Email Help Team
            </a>
        </div>
        <p className="text-xs text-gray-600 mt-4">
          ✨ All support is free, always. We&apos;re here because we care, not for profit.
        </p>
      </section>
    </div>
  );
}
