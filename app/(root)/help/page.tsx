import { Metadata } from 'next';
import {
  HelpCircle,
  MessageCircle,
  BookOpen,
  Lightbulb,
  Mail,
  Github,
  ChevronDown
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'Help Center | OpenStock',
  description: 'Community-driven support for OpenStock. No paywalls, just help.',
};

export default function HelpPage() {
  const faqs = [
    {
      question: "Is OpenStock really free forever?",
      answer: "Yes! We run on donations and community contribution. Core features (tracking, alerts, analysis) will remain free. We believe financial tools shouldn't be luxury items."
    },
    {
      question: "How do I add stocks to my watchlist?",
      answer: "Use the search bar at the top or in the header to find a company. On the stock's detail page, click the 'Heart' or 'Star' icon to instantly add it to your dashboard."
    },
    {
      question: "Where does the market data come from?",
      answer: "We partner with Finnhub and other providers to offer real-time and delayed data. While robust, please use it for analysis rather than high-frequency trading."
    },
    {
      question: "Can I contribute code or designs?",
      answer: "Absolutely! Check our GitHub repository. We label issues as 'good first issue' for beginners. We welcome designers, developers, and writers alike."
    },
    {
      question: "My alerts aren't triggering.",
      answer: "Alerts run every 5 minutes via our background jobs. Ensure you've confirmed your email address, as we send notifications primarily via email."
    }
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 pb-20">

      {/* Header */}
      <div className="text-center pt-16 pb-12 space-y-4">
        <div className="inline-flex p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 mb-4">
          <HelpCircle className="text-blue-400 h-8 w-8" />
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-white">How can we help?</h1>
        <p className="text-xl text-gray-400">Community-powered support for everyone.</p>
      </div>

      {/* Quick Action Grid */}
      <div className="grid md:grid-cols-3 gap-4 mb-16">
        <HelpCard
          icon={<BookOpen className="text-teal-400" />}
          title="Read Docs"
          desc="Deep dive into features and API integration."
          link="/api-docs"
          linkText="View Documentation"
        />
        <HelpCard
          icon={<MessageCircle className="text-purple-400" />}
          title="Community Chat"
          desc="Get real-time answers from other users."
          link="https://discord.gg/JkJ8kfxgxB"
          linkText="Join Discord"
        />
        <HelpCard
          icon={<Github className="text-white" />}
          title="Report Bugs"
          desc="Found an issue? Let our developers know."
          link="https://github.com/Open-Dev-Society/OpenStock/issues"
          linkText="Open Issue"
        />
      </div>

      {/* FAQs */}
      <div className="space-y-8">
        <h2 className="text-2xl font-bold text-white border-b border-gray-800 pb-4">Frequently Asked Questions</h2>
        <div className="grid gap-4">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-gray-900/50 border border-gray-800 rounded-xl p-6 hover:bg-gray-800/50 transition-colors">
              <h3 className="font-semibold text-lg text-gray-200 mb-2 flex items-start gap-3">
                <Lightbulb size={20} className="text-yellow-500/50 mt-1 shrink-0" />
                {faq.question}
              </h3>
              <p className="text-gray-400 leading-relaxed ml-8 pl-1 border-l-2 border-gray-800">
                {faq.answer}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Direct Contact */}
      <div className="mt-20 bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-2xl p-8 text-center">
        <h3 className="text-xl font-bold text-white mb-2">Still stuck?</h3>
        <p className="text-gray-400 mb-6">Our team (and community) answers emails, usually entirely for free.</p>
        <a
          href="mailto:opendevsociety@gmail.com"
          className="inline-flex items-center gap-2 bg-white text-black px-6 py-3 rounded-lg font-medium hover:bg-gray-200 transition-colors"
        >
          <Mail size={18} />
          Contact Support
        </a>
      </div>

    </div>
  );
}

function HelpCard({ icon, title, desc, link, linkText }: any) {
  return (
    <div className="bg-gray-900 border border-gray-800 p-6 rounded-xl flex flex-col items-start hover:border-gray-700 transition-colors">
      <div className="mb-4 bg-gray-800 p-2 rounded-lg">{icon}</div>
      <h3 className="font-bold text-white text-lg mb-2">{title}</h3>
      <p className="text-sm text-gray-400 mb-6 flex-grow">{desc}</p>
      <a href={link} className="text-teal-400 text-sm font-medium hover:underline flex items-center gap-1">
        {linkText} <ChevronDown size={14} className="-rotate-90" />
      </a>
    </div>
  );
}
