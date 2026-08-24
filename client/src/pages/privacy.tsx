import SEO from "@/components/seo";

const sections = [
  {
    title: "What this policy covers",
    body: <p>This Privacy Policy explains how Ground Up BJJ / Ground Up ("Ground Up," "we," or "us") handles information collected through our website, contact forms, trial and booking requests, interest lists, and information submitted through Meta Instant Forms. Ground Up is located in Oxnard, California.</p>,
  },
  {
    title: "Information we may collect",
    body: <>
      <p>Depending on how you interact with us, we may collect:</p>
      <ul>
        <li>Your name, email address, phone number, and contact preferences</li>
        <li>The program you are interested in, your training experience, and information in a lead form response</li>
        <li>Booking or trial-request details and messages you send through our contact forms</li>
        <li>Membership, attendance, intake, fitness-related, or child/minor information when you or a guardian voluntarily provide it for program administration</li>
        <li>Website usage information, such as pages visited, device or browser information, referrer, and marketing attribution details such as UTM values when available</li>
        <li>Cookies, analytics identifiers, and similar technologies where applicable and where you have made the relevant choice</li>
      </ul>
    </>,
  },
  {
    title: "How information is collected",
    body: <p>We collect information you provide directly, including through website forms, booking requests, interest lists, contact messages, and Meta Instant Forms. We may also receive limited information from service providers that help us operate forms, bookings, analytics, communications, or our member portal. We do not require marketing attribution fields, and we do not invent them when they are unavailable.</p>,
  },
  {
    title: "How we use information",
    body: <ul>
      <li>To respond to questions, trial requests, bookings, and program interest</li>
      <li>To administer memberships, classes, attendance, intake, and safety-related program needs</li>
      <li>To communicate with leads, members, and guardians about requests, classes, scheduling, and account matters</li>
      <li>To understand which programs and pages are useful and improve the website</li>
      <li>To understand the source of an inquiry when optional attribution information is available</li>
      <li>To protect the website, members, and staff and to meet applicable obligations</li>
    </ul>,
  },
  {
    title: "Communications",
    body: <p>When you submit a request, we may contact you using the details you provide to respond to that request or coordinate a class, booking, membership, or other service. You can ask us to stop non-essential communications at any time. We will still send service-related messages when needed to complete a request or administer an account.</p>,
  },
  {
    title: "Meta Instant Forms",
    body: <p>If you submit a lead form on Meta, the information you provide is shared with Ground Up so we can respond to your request. We handle that information under this policy and use it for the purposes described above. Meta also processes information under its own privacy terms. Please do not submit information that is not needed for your inquiry.</p>,
  },
  {
    title: "Service providers and sharing",
    body: <p>We may use carefully selected service providers for hosting, databases, member-portal functions, booking, communications, analytics, security, and form processing. They may process information only as needed to provide services to Ground Up. We do not sell your personal information. We may disclose information when reasonably necessary to protect people or property, comply with law, or handle a business transfer.</p>,
  },
  {
    title: "Analytics, cookies, and advertising",
    body: <p>We may use cookies or similar technologies for essential website operation and, when you consent, for analytics and understanding marketing attribution. Analytics events are intended to be recorded only after the applicable consent choice. We may use advertising or lead platforms such as Meta to receive information you voluntarily submit through their forms. We do not treat analytics as a complete count of all leads.</p>,
  },
  {
    title: "Retention and security",
    body: <p>We retain information for as long as reasonably needed to respond to your request, provide services, maintain business and safety records, resolve disputes, and meet legal or operational needs. Retention periods can vary by the type of information. We use reasonable administrative, technical, and organizational safeguards, but no online system can be guaranteed completely secure.</p>,
  },
  {
    title: "Your choices and California contact",
    body: <p>You may contact us to ask what personal information you provided, request correction, ask questions about our handling of it, or request deletion where applicable. We may need to verify your request and may retain information when required or reasonably necessary for safety, legal, or business purposes. California residents may contact us about privacy rights at <a href="mailto:info@groundupbjj.com">info@groundupbjj.com</a>.</p>,
  },
  {
    title: "Children and minors",
    body: <p>Ground Up offers programs for children and may receive a child's information from a parent or legal guardian for enrollment, scheduling, safety, or program administration. A parent or guardian should submit information for a minor. We do not knowingly ask children to provide more information than is reasonably needed for these purposes.</p>,
  },
  {
    title: "Updates and contact",
    body: <p>We may update this policy from time to time as our website, programs, or practices change. The updated version will be posted on this page with a revised date. For privacy questions, contact Ground Up BJJ / Ground Up in Oxnard, California at <a href="mailto:info@groundupbjj.com">info@groundupbjj.com</a>.</p>,
  },
];

export default function Privacy() {
  return (
    <main className="bg-[#0B0F14] text-gray-300 min-h-screen">
      <SEO
        title="Privacy Policy | Ground Up BJJ"
        description="Learn how Ground Up BJJ in Oxnard collects, uses, and protects information submitted through our website, forms, and marketing channels."
        canonical="/privacy"
      />
      <section className="pt-32 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-[#FFB199] text-sm font-semibold tracking-[0.2em] uppercase mb-4">Ground Up BJJ / Ground Up</p>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-5" style={{ fontFamily: "var(--font-display)" }}>Privacy Policy</h1>
          <p className="text-gray-400">Effective date: August 24, 2026</p>
          <div className="mt-12 space-y-10 text-base leading-8">
            {sections.map((section) => (
              <section key={section.title}>
                <h2 className="text-2xl font-semibold text-white mb-3">{section.title}</h2>
                <div className="space-y-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:pl-2 [&_a]:text-[#5EEBFF] [&_a]:underline">
                  {section.body}
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}