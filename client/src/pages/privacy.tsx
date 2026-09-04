import SEO from "@/components/seo";
import { localizedPublicPath, useLocale } from "@/lib/locale";

const sections = {
  en: [
    ["What this policy covers", "This Privacy Policy explains how Ground Up BJJ / Ground Up (\"Ground Up,\" \"we,\" or \"us\") handles information collected through our website, contact forms, trial and booking requests, interest lists, and information submitted through Meta Instant Forms. Ground Up is located in Oxnard, California."],
    ["Information we may collect", "Depending on how you interact with us, we may collect your name, email address, phone number, contact preferences, program interest, training experience, lead-form responses, booking details, messages, membership and attendance information, intake and fitness-related information, child or minor information voluntarily provided by a guardian, website usage information, marketing attribution, cookies, and analytics identifiers where applicable."],
    ["How information is collected", "We collect information you provide directly through website forms, booking requests, interest lists, contact messages, and Meta Instant Forms. We may also receive limited information from service providers that help us operate forms, bookings, analytics, communications, or our member portal. We do not require marketing attribution fields and do not invent them when they are unavailable."],
    ["How we use information", "We use information to respond to questions, trial requests, bookings, and program interest; administer memberships, classes, attendance, intake, and safety needs; communicate about requests and accounts; improve the website; understand optional inquiry attribution; and protect the website, members, and staff."],
    ["Communications", "When you submit a request, we may contact you using the details you provide to respond or coordinate a class, booking, membership, or other service. You can ask us to stop non-essential communications at any time. Service-related messages may still be sent when needed to complete a request or administer an account."],
    ["Meta Instant Forms", "If you submit a lead form on Meta, the information you provide is shared with Ground Up so we can respond. We handle that information under this policy. Meta also processes information under its own privacy terms. Please do not submit information that is not needed for your inquiry."],
    ["Service providers and sharing", "We may use selected service providers for hosting, databases, member-portal functions, booking, communications, analytics, security, and form processing. They may process information only as needed to provide services to Ground Up. We do not sell personal information. We may disclose information when reasonably necessary to protect people or property, comply with law, or handle a business transfer."],
    ["Analytics, cookies, and advertising", "We may use cookies or similar technologies for essential website operation and, when you consent, for analytics and marketing attribution. Analytics events are intended to be recorded only after the applicable consent choice. We may use advertising or lead platforms such as Meta to receive information you voluntarily submit through their forms."],
    ["Retention and security", "We retain information as long as reasonably needed to respond to requests, provide services, maintain business and safety records, resolve disputes, and meet legal or operational needs. We use reasonable safeguards, but no online system can be guaranteed completely secure."],
    ["Your choices and California contact", "You may contact us to ask what personal information you provided, request correction, ask questions about our handling of it, or request deletion where applicable. We may need to verify your request and retain information when required or reasonably necessary. California residents may contact us about privacy rights at info@groundupbjj.com."],
    ["Children and minors", "Ground Up may offer programs for girls and female youth and may receive a minor's information from a parent or legal guardian for enrollment, scheduling, safety, or program administration. A parent or guardian should submit information for a minor. We do not knowingly ask children to provide more information than reasonably needed."],
    ["Updates and contact", "We may update this policy as our website, programs, or practices change. The updated version will be posted on this page with a revised date. For privacy questions, contact Ground Up BJJ / Ground Up in Oxnard, California at info@groundupbjj.com."],
  ],
  es: [
    ["Qué cubre esta política", "Esta Política de Privacidad explica cómo Ground Up BJJ / Ground Up (\"Ground Up\", \"nosotros\") maneja la información recopilada a través del sitio web, formularios de contacto, solicitudes de prueba y reserva, listas de interés y formularios instantáneos de Meta. Ground Up está ubicado en Oxnard, California."],
    ["Información que podemos recopilar", "Según cómo interactúes con nosotros, podemos recopilar tu nombre, correo electrónico, teléfono, preferencias de contacto, programa de interés, experiencia de entrenamiento, respuestas de formularios, datos de reservas, mensajes, información de membresía y asistencia, datos de ingreso y condición física, e información de menores proporcionada voluntariamente por una tutora o tutor, además de datos de uso del sitio, atribución de marketing, cookies e identificadores analíticos cuando corresponda."],
    ["Cómo recopilamos la información", "Recopilamos la información que proporcionas directamente mediante formularios del sitio, solicitudes de reserva, listas de interés, mensajes de contacto y formularios instantáneos de Meta. También podemos recibir información limitada de proveedores que ayudan a operar formularios, reservas, analíticas, comunicaciones o el portal de miembros. No exigimos campos de atribución de marketing ni los inventamos cuando no están disponibles."],
    ["Cómo usamos la información", "Usamos la información para responder preguntas, solicitudes de prueba, reservas e interés en programas; administrar membresías, clases, asistencia, formularios de ingreso y necesidades de seguridad; comunicarnos sobre solicitudes y cuentas; mejorar el sitio; entender el origen opcional de una consulta; y proteger el sitio, a sus miembros y al personal."],
    ["Comunicaciones", "Cuando envías una solicitud, podemos contactarte usando los datos que proporcionaste para responder o coordinar una clase, reserva, membresía u otro servicio. Puedes pedir que detengamos las comunicaciones no esenciales. Aun así, podemos enviar mensajes relacionados con el servicio cuando sean necesarios para completar una solicitud o administrar una cuenta."],
    ["Formularios instantáneos de Meta", "Si envías un formulario de contacto en Meta, la información que proporciones se comparte con Ground Up para que podamos responderte. La manejamos bajo esta política. Meta también procesa información bajo sus propios términos de privacidad. No envíes información que no sea necesaria para tu consulta."],
    ["Proveedores y divulgación", "Podemos usar proveedores seleccionados para alojamiento, bases de datos, portal de miembros, reservas, comunicaciones, analíticas, seguridad y procesamiento de formularios. Solo pueden procesar información cuando sea necesario para prestar servicios a Ground Up. No vendemos información personal. Podemos divulgar información cuando sea razonablemente necesario para proteger a personas o bienes, cumplir la ley o gestionar una transferencia comercial."],
    ["Analíticas, cookies y publicidad", "Podemos usar cookies o tecnologías similares para el funcionamiento esencial del sitio y, cuando des tu consentimiento, para analíticas y atribución de marketing. Los eventos analíticos deben registrarse solo después de la elección de consentimiento correspondiente. Podemos usar plataformas publicitarias o de formularios como Meta para recibir información que envíes voluntariamente."],
    ["Conservación y seguridad", "Conservamos la información mientras sea razonablemente necesario para responder solicitudes, prestar servicios, mantener registros comerciales y de seguridad, resolver disputas y cumplir necesidades legales u operativas. Usamos medidas razonables de seguridad, pero ningún sistema en línea puede garantizarse completamente seguro."],
    ["Tus opciones y contacto en California", "Puedes contactarnos para preguntar qué información personal proporcionaste, solicitar una corrección, hacer preguntas sobre su manejo o pedir su eliminación cuando corresponda. Podemos verificar tu solicitud y conservar información cuando sea necesario por motivos de seguridad, legales o comerciales. Puedes escribir sobre derechos de privacidad a info@groundupbjj.com."],
    ["Niñas y menores", "Ground Up puede ofrecer programas para niñas y jóvenes femeninas y recibir información de una menor de parte de su madre, padre o tutora para inscripción, horarios, seguridad o administración del programa. Una persona adulta responsable debe enviar la información de una menor. No pedimos conscientemente más información de la necesaria."],
    ["Actualizaciones y contacto", "Podemos actualizar esta política cuando cambien el sitio, los programas o nuestras prácticas. La versión actualizada se publicará en esta página con una nueva fecha. Para preguntas de privacidad, escribe a Ground Up BJJ / Ground Up en Oxnard, California: info@groundupbjj.com."],
  ],
} as const;

export default function Privacy() {
  const { locale } = useLocale();
  const copy = locale === "es" ? {
    title: "Política de privacidad",
    effective: "Fecha de vigencia: 24 de agosto de 2026",
    seoTitle: "Política de Privacidad | Ground Up BJJ",
    seoDescription: "Conoce cómo Ground Up BJJ en Oxnard recopila, usa y protege la información enviada a través del sitio, formularios y canales de marketing.",
  } : {
    title: "Privacy Policy",
    effective: "Effective date: August 24, 2026",
    seoTitle: "Privacy Policy | Ground Up BJJ",
    seoDescription: "Learn how Ground Up BJJ in Oxnard collects, uses, and protects information submitted through our website, forms, and marketing channels.",
  };
  return (
    <main className="bg-[#0B0F14] text-gray-300 min-h-screen">
      <SEO
        title={copy.seoTitle}
        description={copy.seoDescription}
        canonical={localizedPublicPath("/privacy", locale)}
      />
      <section className="pt-32 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <p className="text-[#FFB199] text-sm font-semibold tracking-[0.2em] uppercase mb-4">Ground Up BJJ / Ground Up</p>
          <h1 className="text-4xl md:text-6xl font-bold text-white mb-5" style={{ fontFamily: "var(--font-display)" }}>{copy.title}</h1>
          <p className="text-gray-400">{copy.effective}</p>
          <div className="mt-12 space-y-10 text-base leading-8">
            {sections[locale].map(([title, body]) => (
              <section key={title}>
                <h2 className="text-2xl font-semibold text-white mb-3">{title}</h2>
                <div className="space-y-3 [&_ul]:list-disc [&_ul]:pl-6 [&_li]:pl-2 [&_a]:text-[#5EEBFF] [&_a]:underline">
                  <p>{body}</p>
                </div>
              </section>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}