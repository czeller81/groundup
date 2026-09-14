import type { Express, Request, Response, NextFunction } from "express";
import express from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertBookingSchema, type AccountStatus, type SafeUser } from "@shared/schema";
import { z } from "zod";
import { discoveryPassClaimRequestSchema, normalizeDiscoveryPassClaimInput } from "./discovery-pass-b";
import Stripe from "stripe";
import { addHours, addMinutes, format, parseISO } from "date-fns";
import fs from "fs";
import path from "path";
import crypto from "node:crypto";
import { parseRawJsonBody, verifyCalendlySignature, verifyStripeSignature } from "./webhook-security";
import {
  bookingBelongsToUser,
  coachCanManageMember,
  createPublicRateLimit,
  getRequestSignalHashes,
  hashClientSignal,
  publicBotCheck,
  requireAuth,
  requireRole,
} from "./route-security";
import {
  sendContactAcknowledgementEmail,
  sendEmailVerificationEmail,
  sendLeadAcknowledgementEmail,
  sendPasswordResetEmail,
  sendStaffNotificationEmail,
} from "./email";
import { registerClassBookingRoutes } from "./class-booking-routes";
import { registerMemberRoutes } from "./member-routes";
import { registerAiManagementRoutes } from "./ai-management-api";
import { applyStripeSubscription, expirePendingCheckoutSession } from "./membership-billing";
import { applyDocumentLocale } from "./document-locale";
import {
  deliverMetaDiscoveryTestEvent,
  getMetaServerTestConfig,
  metaServerTestConfigurationState,
} from "./meta-conversions";

const PAGE_META: Record<string, { title: string; description: string; canonical: string }> = {
  "/": {
    title: "Women-Only BJJ & Self-Defense in Oxnard | Ground Up",
    description: "Ground Up is a women-only training center in Oxnard for Brazilian Jiu-Jitsu, practical self-defense, strength, and movement. Beginner-friendly small-group coaching. Get your free Discovery Pass.",
    canonical: "https://www.groundupbjj.com/",
  },
  "/schedule": {
    title: "Women-Only Class Schedule in Oxnard | Ground Up",
    description: "View the live Google Calendar schedule for Ground Up's women-only Brazilian Jiu-Jitsu, self-defense, strength, and movement classes in Oxnard.",
    canonical: "https://www.groundupbjj.com/schedule",
  },
  "/pricing": {
    title: "Women-Only Training Programs in Oxnard | Ground Up",
    description: "Explore women-only Brazilian Jiu-Jitsu, practical self-defense, strength, movement, and personal coaching at Ground Up in Oxnard. Beginner-friendly and no experience required.",
    canonical: "https://www.groundupbjj.com/pricing",
  },
  "/coaches": {
    title: "Our BJJ Coach — Raymi Gonzalez, Gracie Barra Lineage | Ground Up Jiu-Jitsu Oxnard",
    description: "Meet Coach Raymi Gonzalez, Purple Belt (3rd Degree) under the Gracie Barra lineage. Head instructor at Ground Up Jiu-Jitsu & Fitness in Oxnard, CA with 5+ years of coaching experience.",
    canonical: "https://www.groundupbjj.com/coaches",
  },
  "/personal-training": {
    title: "Personal Training in Oxnard, CA — 1-on-1 BJJ & Fitness Coaching | Ground Up BJJ",
    description: "Ask about private personal training at Ground Up Jiu-Jitsu in Oxnard, CA. Custom 1-on-1 coaching for women; availability is confirmed before booking.",
    canonical: "https://www.groundupbjj.com/personal-training",
  },
  "/contact": {
    title: "Contact Ground Up | Women-Only Training in Oxnard",
    description: "Questions about women-only Brazilian Jiu-Jitsu, practical self-defense, strength, movement, or girls/female-youth eligibility? Contact Ground Up in Oxnard.",
    canonical: "https://www.groundupbjj.com/contact",
  },
  "/privacy": {
    title: "Privacy Policy | Ground Up BJJ",
    description: "Learn how Ground Up BJJ in Oxnard collects, uses, and protects information submitted through our website, forms, and marketing channels.",
    canonical: "https://www.groundupbjj.com/privacy",
  },
  "/book": {
    title: "Get Your Free Discovery Pass | Ground Up Oxnard",
    description: "Create an account, complete the required forms, activate your free Discovery Pass, then book one eligible SKILL class and one eligible STRENGTH class.",
    canonical: "https://www.groundupbjj.com/book",
  },
  "/womens-self-defense": {
    title: "Women's Self-Defense Program — 8 Weeks in Oxnard, CA | Ground Up Jiu-Jitsu",
    description: "An 8-week Women's Self-Defense program in Oxnard, CA. Practical BJJ-based techniques, situational awareness, and confidence in a women-only class. Start with a free Discovery Pass.",
    canonical: "https://www.groundupbjj.com/womens-self-defense",
  },
  "/kids": {
    title: "Girls & Female Youth Training | Ground Up Oxnard",
    description: "Ground Up's women-centered girls and female-youth path in Oxnard. Ask about current eligibility, guardian requirements, and mother-daughter options.",
    canonical: "https://www.groundupbjj.com/girls",
  },
  "/girls": {
    title: "Girls & Mother-Daughter Training | Ground Up Oxnard",
    description: "Explore Ground Up's girls and female-youth training path in Oxnard. Ask about current eligibility, beginner-friendly classes, and mother-daughter options.",
    canonical: "https://www.groundupbjj.com/girls",
  },
  "/es": {
    title: "Jiu-Jitsu y Defensa Personal Solo para Mujeres en Oxnard",
    description: "Ground Up es un centro de entrenamiento solo para mujeres en Oxnard: jiu-jitsu brasileño, defensa personal, fuerza y movimiento. No necesitas experiencia.",
    canonical: "https://www.groundupbjj.com/es",
  },
  "/es/horario": {
    title: "Horario de Clases para Mujeres en Oxnard",
    description: "Consulta el horario en vivo de las clases de Ground Up para mujeres en Oxnard.",
    canonical: "https://www.groundupbjj.com/es/horario",
  },
  "/es/reservar": {
    title: "Obtén tu Discovery Pass Gratis | Ground Up Oxnard",
    description: "Crea una cuenta, completa los formularios requeridos, activa tu Discovery Pass gratis y reserva una clase elegible de SKILL y una de STRENGTH.",
    canonical: "https://www.groundupbjj.com/es/reservar",
  },
  "/es/programas": {
    title: "Programas de Entrenamiento para Mujeres en Oxnard",
    description: "Conoce los programas de jiu-jitsu, defensa personal, fuerza, movimiento y entrenamiento personal de Ground Up.",
    canonical: "https://www.groundupbjj.com/es/programas",
  },
  "/es/pricing": {
    title: "Programas de Entrenamiento para Mujeres en Oxnard",
    description: "Conoce los programas de jiu-jitsu, defensa personal, fuerza, movimiento y entrenamiento personal de Ground Up.",
    canonical: "https://www.groundupbjj.com/es/pricing",
  },
  "/es/coaches": {
    title: "Nuestra Entrenadora de Jiu-Jitsu | Ground Up Oxnard",
    description: "Conoce a Raymi Gonzalez, instructora principal de Ground Up Jiu-Jitsu & Fitness en Oxnard.",
    canonical: "https://www.groundupbjj.com/es/coaches",
  },
  "/es/personal-training": {
    title: "Entrenamiento Personal en Oxnard | Ground Up BJJ",
    description: "Pregunta por entrenamiento personal privado de jiu-jitsu y acondicionamiento en Ground Up. La disponibilidad se confirma antes de reservar.",
    canonical: "https://www.groundupbjj.com/es/personal-training",
  },
  "/es/contacto": {
    title: "Contacta a Ground Up | Entrenamiento para Mujeres en Oxnard",
    description: "Comunícate con Ground Up para preguntas sobre clases para mujeres, defensa personal, fuerza o elegibilidad juvenil.",
    canonical: "https://www.groundupbjj.com/es/contacto",
  },
  "/es/privacidad": {
    title: "Política de Privacidad | Ground Up BJJ",
    description: "Conoce cómo Ground Up protege la información enviada a través del sitio, formularios y reservas.",
    canonical: "https://www.groundupbjj.com/es/privacidad",
  },
  "/es/womens-self-defense": {
    title: "Defensa Personal para Mujeres | Ground Up Oxnard",
    description: "Programa de defensa personal para mujeres en Oxnard con técnicas prácticas de jiu-jitsu. Comienza con un Discovery Pass gratis.",
    canonical: "https://www.groundupbjj.com/es/womens-self-defense",
  },
  "/es/girls": {
    title: "Jiu-Jitsu para Niñas y Madres e Hijas | Ground Up Oxnard",
    description: "Conoce el camino de entrenamiento para niñas y jóvenes. Pregunta por elegibilidad, requisitos de tutora y opciones para madres e hijas.",
    canonical: "https://www.groundupbjj.com/es/girls",
  },
  "/adaptive-capacity": {
    title: "Adaptive Capacity — Build the Capacity to Adapt | Ground Up",
    description: "A Ground Up learning experience for building clearer thinking, better decisions, and practical adaptability as work and life change.",
    canonical: "https://www.groundupbjj.com/adaptive-capacity",
  },
  "/es/adaptive-capacity": {
    title: "Capacidad Adaptativa — Desarrolla tu capacidad de adaptarte | Ground Up",
    description: "Desarrolla la capacidad de adaptarte a lo que venga mediante aprendizaje práctico, reflexión y acción.",
    canonical: "https://www.groundupbjj.com/es/adaptive-capacity",
  },
  "/discovery-pass": {
    title: "Free Discovery Pass | Ground Up BJJ Oxnard",
    description: "Try Ground Up with a free seven-day Discovery Pass including one SKILL class and one STRENGTH class. Beginner-friendly coaching in Oxnard.",
    canonical: "https://www.groundupbjj.com/discovery-pass",
  },
  "/es/discovery-pass": {
    title: "Discovery Pass gratis | Ground Up BJJ Oxnard",
    description: "Prueba Ground Up con un Discovery Pass gratis de siete días que incluye una clase de SKILL y una clase de STRENGTH. Coaching para principiantes en Oxnard.",
    canonical: "https://www.groundupbjj.com/es/discovery-pass",
  },
  "/discovery-pass-b": {
    title: "Claim Your Free Discovery Pass | Ground Up BJJ Oxnard",
    description: "Claim a free seven-day Ground Up Discovery Pass with one SKILL class and one STRENGTH class, then create your secure member account.",
    canonical: "https://www.groundupbjj.com/discovery-pass-b",
  },
  "/es/discovery-pass-b": {
    title: "Reclama tu Discovery Pass gratis | Ground Up BJJ Oxnard",
    description: "Reclama un Discovery Pass gratis de siete días con una clase de SKILL y una clase de STRENGTH, y después crea tu cuenta segura.",
    canonical: "https://www.groundupbjj.com/es/discovery-pass-b",
  },
};

const HREFLANG_PAIRS: Record<string, { en?: string; es?: string; xDefault?: string }> = {
  "/": { en: "https://www.groundupbjj.com/", es: "https://www.groundupbjj.com/es", xDefault: "https://www.groundupbjj.com/" },
  "/es": { en: "https://www.groundupbjj.com/", es: "https://www.groundupbjj.com/es", xDefault: "https://www.groundupbjj.com/" },
  "/pricing": { en: "https://www.groundupbjj.com/pricing", es: "https://www.groundupbjj.com/es/programas" },
  "/es/programas": { en: "https://www.groundupbjj.com/pricing", es: "https://www.groundupbjj.com/es/programas" },
  "/es/pricing": { en: "https://www.groundupbjj.com/pricing", es: "https://www.groundupbjj.com/es/pricing" },
  "/coaches": { en: "https://www.groundupbjj.com/coaches", es: "https://www.groundupbjj.com/es/coaches" },
  "/es/coaches": { en: "https://www.groundupbjj.com/coaches", es: "https://www.groundupbjj.com/es/coaches" },
  "/personal-training": { en: "https://www.groundupbjj.com/personal-training", es: "https://www.groundupbjj.com/es/personal-training" },
  "/es/personal-training": { en: "https://www.groundupbjj.com/personal-training", es: "https://www.groundupbjj.com/es/personal-training" },
  "/schedule": { en: "https://www.groundupbjj.com/schedule", es: "https://www.groundupbjj.com/es/horario" },
  "/es/horario": { en: "https://www.groundupbjj.com/schedule", es: "https://www.groundupbjj.com/es/horario" },
  "/book": { en: "https://www.groundupbjj.com/book", es: "https://www.groundupbjj.com/es/reservar" },
  "/es/reservar": { en: "https://www.groundupbjj.com/book", es: "https://www.groundupbjj.com/es/reservar" },
  "/contact": { en: "https://www.groundupbjj.com/contact", es: "https://www.groundupbjj.com/es/contacto" },
  "/es/contacto": { en: "https://www.groundupbjj.com/contact", es: "https://www.groundupbjj.com/es/contacto" },
  "/privacy": { en: "https://www.groundupbjj.com/privacy", es: "https://www.groundupbjj.com/es/privacidad" },
  "/es/privacidad": { en: "https://www.groundupbjj.com/privacy", es: "https://www.groundupbjj.com/es/privacidad" },
  "/womens-self-defense": { en: "https://www.groundupbjj.com/womens-self-defense", es: "https://www.groundupbjj.com/es/womens-self-defense" },
  "/es/womens-self-defense": { en: "https://www.groundupbjj.com/womens-self-defense", es: "https://www.groundupbjj.com/es/womens-self-defense" },
  "/girls": { en: "https://www.groundupbjj.com/girls", es: "https://www.groundupbjj.com/es/girls" },
  "/es/girls": { en: "https://www.groundupbjj.com/girls", es: "https://www.groundupbjj.com/es/girls" },
  "/discovery-pass": { en: "https://www.groundupbjj.com/discovery-pass", es: "https://www.groundupbjj.com/es/discovery-pass", xDefault: "https://www.groundupbjj.com/discovery-pass" },
  "/es/discovery-pass": { en: "https://www.groundupbjj.com/discovery-pass", es: "https://www.groundupbjj.com/es/discovery-pass", xDefault: "https://www.groundupbjj.com/discovery-pass" },
  "/discovery-pass-b": { en: "https://www.groundupbjj.com/discovery-pass-b", es: "https://www.groundupbjj.com/es/discovery-pass-b", xDefault: "https://www.groundupbjj.com/discovery-pass-b" },
  "/es/discovery-pass-b": { en: "https://www.groundupbjj.com/discovery-pass-b", es: "https://www.groundupbjj.com/es/discovery-pass-b", xDefault: "https://www.groundupbjj.com/discovery-pass-b" },
  "/adaptive-capacity": { en: "https://www.groundupbjj.com/adaptive-capacity", es: "https://www.groundupbjj.com/es/adaptive-capacity" },
  "/es/adaptive-capacity": { en: "https://www.groundupbjj.com/adaptive-capacity", es: "https://www.groundupbjj.com/es/adaptive-capacity" },
};

const PAGE_CONTENT: Record<string, string> = {
  "/": `<h1>Women-Only Brazilian Jiu-Jitsu and Self-Defense in Oxnard</h1>
 <p>Ground Up is a women-only training center for Brazilian Jiu-Jitsu, practical self-defense, strength, movement, and personal coaching.</p>
 <p>Women of all experience levels can start here. No prior experience is required.</p>
 <ul><li>Women's BJJ</li><li>Women's Self-Defense</li><li>Strength &amp; Movement</li><li>Personal Training</li><li>Girls / Female Youth — eligibility confirmed before booking</li></ul>
 <p>Head Coach: Raymi Gonzalez — Purple Belt, 3rd Degree, Gracie Barra Lineage. 5+ years coaching experience in Oxnard, CA.</p>
 <a href="/discovery-pass">Get Your Free Discovery Pass</a> <a href="/schedule">View Class Schedule</a>`,
  "/es": `<h1>Jiu-Jitsu Brasileño y Defensa Personal para Mujeres en Oxnard</h1>
 <p>Ground Up es un centro de entrenamiento solo para mujeres: jiu-jitsu brasileño, defensa personal práctica, fuerza, movimiento y coaching personal.</p>
 <p>Mujeres de todos los niveles pueden comenzar aquí. No necesitas experiencia previa.</p>
 <ul><li>Jiu-jitsu para mujeres</li><li>Defensa personal para mujeres</li><li>Fuerza y movimiento</li><li>Entrenamiento personal</li><li>Niñas y jóvenes — la elegibilidad se confirma antes de reservar</li></ul>
 <p>Entrenadora principal: Raymi Gonzalez — cinturón morado, tercer grado, linaje Gracie Barra. Más de 5 años de experiencia como entrenadora en Oxnard, California.</p>
 <a href="/es/discovery-pass">Obtén tu Discovery Pass gratis</a> <a href="/es/horario">Ver horario de clases</a>`,
  "/schedule": `<h1>Women-Only Class Schedule — Ground Up, Oxnard</h1>
 <p>See live availability for women-only Brazilian Jiu-Jitsu, self-defense, strength, and movement classes in Oxnard.</p>
  <a href="/discovery-pass">Get Your Free Discovery Pass</a>`,
  "/es/horario": `<h1>Horario de Clases para Mujeres — Ground Up, Oxnard</h1>
 <p>Consulta la disponibilidad en vivo de las clases de jiu-jitsu brasileño, defensa personal, fuerza y movimiento para mujeres en Oxnard.</p>
  <a href="/es/discovery-pass">Obtén tu Discovery Pass gratis</a>`,
  "/pricing": `<h1>Women-Only Training Programs — Ground Up, Oxnard</h1>
 <p>Beginner-friendly Brazilian Jiu-Jitsu, practical self-defense, strength, movement, and personal coaching for women.</p>
 <ul><li>Women's BJJ</li><li>Women's Self-Defense</li><li>Strength &amp; Movement</li><li>Personal Training</li><li>Girls / Female Youth — eligibility confirmed before booking</li></ul>
  <a href="/discovery-pass">Get Your Free Discovery Pass</a>`,
  "/es/pricing": `<h1>Programas de Entrenamiento para Mujeres — Ground Up, Oxnard</h1>
 <p>Jiu-jitsu brasileño para principiantes, defensa personal práctica, fuerza, movimiento y coaching personal para mujeres.</p>
 <ul><li>Jiu-jitsu para mujeres</li><li>Defensa personal para mujeres</li><li>Fuerza y movimiento</li><li>Entrenamiento personal</li><li>Niñas y jóvenes — la elegibilidad se confirma antes de reservar</li></ul>
  <a href="/es/discovery-pass">Obtén tu Discovery Pass gratis</a>`,
  "/coaches": `<h1>BJJ Instructor — Raymi Gonzalez | Ground Up Jiu-Jitsu, Oxnard CA</h1>
<p>Meet Raymi Gonzalez, Purple Belt (3rd Degree) under the Gracie Barra lineage. 5+ years of coaching experience in Oxnard, CA.</p>
 <p>Specialties: Women's Self-Defense, Women's BJJ, Strength &amp; Movement, Personal Training.</p>
  <a href="/discovery-pass">Get Your Free Discovery Pass</a>`,
  "/es/coaches": `<h1>Entrenadora de Jiu-Jitsu — Raymi Gonzalez | Ground Up Oxnard</h1>
 <p>Conoce a Raymi Gonzalez, cinturón morado de tercer grado bajo el linaje Gracie Barra. Tiene más de 5 años de experiencia como entrenadora en Oxnard.</p>
 <p>Especialidades: defensa personal para mujeres, jiu-jitsu para mujeres, fuerza y movimiento, y entrenamiento personal.</p>
  <a href="/es/discovery-pass">Obtén tu Discovery Pass gratis</a>`,
  "/personal-training": `<h1>Personal Training in Oxnard, CA — 1-on-1 BJJ &amp; Fitness Coaching</h1>
 <p>Private personal training sessions at Ground Up Jiu-Jitsu in Oxnard, CA. Custom coaching tailored to your goals; availability is confirmed before booking.</p>
 <ul><li>1-on-1 personalized sessions</li><li>Availability coordinated around your goals</li><li>Women-only coaching</li></ul>
   <a href="/contact">Ask About Personal Training</a>`,
  "/es/personal-training": `<h1>Entrenamiento Personal en Oxnard, California — Coaching de Jiu-Jitsu y Fitness 1 a 1</h1>
  <p>Sesiones privadas de entrenamiento personal en Ground Up Jiu-Jitsu en Oxnard. Coaching personalizado según tus objetivos; la disponibilidad se confirma antes de reservar.</p>
  <ul><li>Sesiones personalizadas 1 a 1</li><li>Disponibilidad coordinada según tus objetivos</li><li>Coaching solo para mujeres</li></ul>
   <a href="/es/contacto">Preguntar sobre entrenamiento personal</a>`,
  "/contact": `<h1>Contact Ground Up Jiu-Jitsu &amp; Fitness — Oxnard, CA</h1>
  <p>Get your free Discovery Pass or get in touch with us. No experience is needed to start your women-only training journey.</p>
<p>Phone: (786) 757-1175 | Email: info@groundupbjj.com | Location: Oxnard, CA</p>
  <a href="/discovery-pass">Get Your Free Discovery Pass</a>`,
  "/es/contacto": `<h1>Contacta a Ground Up Jiu-Jitsu &amp; Fitness — Oxnard, California</h1>
  <p>Obtén tu Discovery Pass gratis o escríbenos. No necesitas experiencia para comenzar tu entrenamiento solo para mujeres.</p>
 <p>Teléfono: (786) 757-1175 | Correo: info@groundupbjj.com | Ubicación: Oxnard, California</p>
  <a href="/es/discovery-pass">Obtén tu Discovery Pass gratis</a>`,
  "/privacy": `<h1>Privacy Policy | Ground Up BJJ</h1>
<p>Ground Up BJJ / Ground Up explains how we collect, use, and protect information submitted through our website, forms, bookings, and marketing channels.</p>
<p>Ground Up is located in Oxnard, California. Privacy questions can be sent to <a href="mailto:info@groundupbjj.com">info@groundupbjj.com</a>.</p>
<h2>Information and choices</h2>
<p>We may collect contact details, program interest, booking requests, form responses, website usage, and optional marketing attribution. We use this information to respond, administer programs, improve the site, and protect our community. See the full policy for details about Meta Instant Forms, service providers, analytics, retention, minors, and California privacy requests.</p>`,
  "/book": `<h1>Get Your Free Discovery Pass — Ground Up, Oxnard</h1>
 <p>Create an account, complete the required forms, activate your pass, then book one eligible SKILL class and one eligible STRENGTH class.</p>
 <p>Girls/female-youth eligibility and guardian requirements are confirmed before booking.</p>`,
  "/es/reservar": `<h1>Obtén tu Discovery Pass Gratis — Ground Up, Oxnard</h1>
 <p>Crea una cuenta, completa los formularios requeridos, activa tu pase y reserva una clase elegible de SKILL y una de STRENGTH.</p>
 <p>Consulta el <a href="/es/horario">horario de clases</a> para conocer las opciones disponibles. Si tienes preguntas, <a href="/es/contacto#contact-form">contacta a Ground Up</a>; la elegibilidad para niñas y jóvenes y los requisitos de tutoría se confirman antes de reservar.</p>
 <a href="/es/contacto#contact-form">Consultar elegibilidad y disponibilidad</a>`,
  "/womens-self-defense": `<h1>Women's Self-Defense Program — 8 Weeks in Oxnard, CA</h1>
<p>A structured 8-week Women's Self-Defense program at Ground Up Jiu-Jitsu in Oxnard, CA. Practical BJJ-based techniques for real situations.</p>
<ul><li>Awareness &amp; prevention</li><li>Breaking grips &amp; escaping</li><li>Ground defense</li><li>Confident body language</li><li>Scenario practice</li></ul>
 <p>Women-only class. Max 6 students. No experience needed. Start with a free Discovery Pass.</p>
  <a href="/discovery-pass">Get Your Free Discovery Pass</a>`,
  "/es/womens-self-defense": `<h1>Programa de Defensa Personal para Mujeres — 8 Semanas en Oxnard</h1>
 <p>Programa estructurado de defensa personal para mujeres en Ground Up Jiu-Jitsu en Oxnard. Técnicas prácticas basadas en jiu-jitsu para situaciones reales.</p>
 <ul><li>Conciencia y prevención</li><li>Cómo zafarte y escapar</li><li>Defensa en el suelo</li><li>Lenguaje corporal seguro</li><li>Práctica de escenarios</li></ul>
 <p>Clase solo para mujeres. Máximo 6 alumnas. No necesitas experiencia. Comienza con un Discovery Pass gratis.</p>
  <a href="/es/discovery-pass">Obtén tu Discovery Pass gratis</a>`,
  "/kids": `<h1>Girls and Female Youth Training — Ground Up, Oxnard</h1>
 <p>Ground Up's youth path is for girls and female youth, not a generic mixed-gender kids academy.</p>
 <p>Eligibility, age range, guardian requirements, and mother-daughter options are confirmed before booking.</p>
 <a href="/girls">Learn about girls training</a>`,
  "/girls": `<h1>Girls and Mother-Daughter Training — Ground Up, Oxnard</h1>
 <p>Ground Up is a women-only training center. When youth programming is available, it is for girls and female youth.</p>
 <p>Contact us to confirm current eligibility, guardian requirements, and mother-daughter options before booking.</p>
 <a href="/contact">Ask about eligibility</a>`,
  "/es/girls": `<h1>Entrenamiento para Niñas y Madres e Hijas — Ground Up, Oxnard</h1>
 <p>Ground Up es un centro de entrenamiento solo para mujeres. Cuando hay programas juveniles, son para niñas y jóvenes.</p>
 <p>Contáctanos para confirmar la elegibilidad actual, los requisitos de la tutora y las opciones para madres e hijas antes de reservar.</p>
 <a href="/es/contacto">Consultar elegibilidad</a>`,
  "/adaptive-capacity": `<h1>Adaptive Capacity — Build the Capacity to Adapt to Whatever Comes Next</h1>
  <p>Ground Up is developing a separate learning experience for people who want practical tools for clearer thinking, better decisions, and more adaptable work and life.</p>
  <p>Join the interest list to hear when the first cohort is ready. Details will be shared as they are confirmed.</p>
  <a href="/adaptive-capacity">Join the interest list</a>`,
  "/es/adaptive-capacity": `<h1>Capacidad Adaptativa — Desarrolla tu capacidad de adaptarte a lo que sigue</h1>
  <p>Ground Up está desarrollando una experiencia de aprendizaje separada para quienes buscan herramientas prácticas para pensar con más claridad, tomar mejores decisiones y adaptarse mejor en el trabajo y la vida.</p>
  <ul><li>Ver el cambio y la incertidumbre con más claridad</li><li>Practicar mejores decisiones</li><li>Desarrollar una capacidad duradera para adaptarte</li></ul>
  <p>Los detalles de la primera cohorte se compartirán cuando estén confirmados.</p>
  <a href="#interest-list">Únete a la lista de interés</a> <a href="/es">Explora el entrenamiento físico</a>`,
  "/discovery-pass": `<h1>Try Ground Up Free with a Discovery Pass</h1>
  <p>Get one SKILL class, one STRENGTH class, and seven days to experience Ground Up in Oxnard.</p>
  <p>Start with a secure member account, complete the required forms, activate your pass, and book your classes.</p>
  <a href="/portal/signup?intent=discovery-pass">Get my free Discovery Pass</a>`,
  "/es/discovery-pass": `<h1>Prueba Ground Up gratis con un Discovery Pass</h1>
  <p>Obtén una clase de SKILL, una clase de STRENGTH y siete días para conocer Ground Up en Oxnard.</p>
  <p>Comienza con una cuenta segura, completa los formularios requeridos, activa tu pase y reserva tus clases.</p>
  <a href="/es/portal/signup?intent=discovery-pass">Obtener mi Discovery Pass gratis</a>`,
  "/discovery-pass-b": `<h1>Claim Your Free Discovery Pass</h1>
  <p>Share your first name and email to continue to a secure Ground Up member account.</p>
  <p>Your account setup comes before forms, activation, and booking. The seven-day pass starts only after you activate it.</p>
  <a href="/portal/signup?intent=discovery-pass">Continue to secure account setup</a>`,
  "/es/discovery-pass-b": `<h1>Reclama tu Discovery Pass gratis</h1>
  <p>Comparte tu nombre y correo para continuar a una cuenta segura de Ground Up.</p>
  <p>Primero configurarás tu cuenta; después completarás los formularios, activarás el pase y reservarás. Los siete días comienzan cuando lo activas.</p>
  <a href="/es/portal/signup?intent=discovery-pass">Continuar a la configuración segura</a>`,
};

async function serveWithMeta(req: Request, res: Response, next: NextFunction) {
  if (process.env.NODE_ENV !== "production") return next();
  const routePath = req.path;
  const meta = PAGE_META[routePath];
  if (!meta) return next();

  try {
    const indexPath = path.resolve(import.meta.dirname, "public", "index.html");
    let html = await fs.promises.readFile(indexPath, "utf-8");
    html = applyDocumentLocale(html, routePath);

    const title = meta.title.replace(/&/g, "&amp;");
    const desc = meta.description.replace(/"/g, "&quot;");

    html = html
      .replace(/<title>[^<]*<\/title>/, `<title>${title}</title>`)
      .replace(
        /<meta name="description"[^>]*>/,
        `<meta name="description" content="${desc}" />`
      )
      .replace(
        /<meta property="og:title"[^>]*>/,
        `<meta property="og:title" content="${title}" />`
      )
      .replace(
        /<meta property="og:description"[^>]*>/,
        `<meta property="og:description" content="${desc}" />`
      )
      .replace(
        /<link rel="canonical"[^>]*>/,
        `<link rel="canonical" href="${meta.canonical}" />`
      )
      .replace(
        /<meta property="og:url"[^>]*>/,
        `<meta property="og:url" content="${meta.canonical}" />`
      )
      .replace(
        /<meta name="twitter:title"[^>]*>/,
        `<meta name="twitter:title" content="${title}" />`
      )
      .replace(
        /<meta name="twitter:description"[^>]*>/,
        `<meta name="twitter:description" content="${desc}" />`
      );

    const alternates = HREFLANG_PAIRS[routePath] || { en: meta.canonical };
    const hreflangLinks = [
      alternates.en && `<link rel="alternate" hreflang="en" href="${alternates.en}" />`,
      alternates.es && `<link rel="alternate" hreflang="es" href="${alternates.es}" />`,
      alternates.xDefault && `<link rel="alternate" hreflang="x-default" href="${alternates.xDefault}" />`,
    ].filter(Boolean).join("\n");
    html = html.replace("</head>", `${hreflangLinks}\n</head>`);

    const content = PAGE_CONTENT[routePath] || "";
    if (content) {
      const noscript = `<noscript style="display:block;padding:20px;font-family:sans-serif;max-width:800px;margin:0 auto">${content}</noscript>`;
      html = html.replace("</body>", `${noscript}\n</body>`);
    }

    res.status(200).set({ "Content-Type": "text/html" }).end(html);
  } catch {
    next();
  }
}

declare module "express-session" {
  interface SessionData {
    userId: string;
    userRole: string;
    discoveryPassClaimId?: string;
    discoveryPassVariant?: "B";
  }
}

const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
const stripeSecretMode = stripeSecretKey?.startsWith("sk_test_")
  ? "test"
  : stripeSecretKey?.startsWith("sk_live_")
    ? "live"
    : stripeSecretKey
      ? "unknown"
      : "unconfigured";
const stripeUsableInEnvironment = process.env.NODE_ENV !== "production" || stripeSecretMode === "live";

if (!stripeSecretKey) {
  console.warn('STRIPE_SECRET_KEY not found. Stripe functionality will be disabled.');
} else if (process.env.NODE_ENV === "production" && stripeSecretMode !== "live") {
  console.error("Production Stripe is not configured with a live secret key. Stripe mutations and webhook processing are disabled.");
}

const stripe = stripeSecretKey && stripeUsableInEnvironment ? new Stripe(stripeSecretKey, {
  apiVersion: "2025-08-27.basil",
}) : null;

const SESSION_TYPES: Record<string, { name: string; duration: number; price: number }> = {
  PT60: { name: "60-Minute 1:1 Training", duration: 60, price: 20 },
  UNLIMITED: { name: "Monthly Unlimited", duration: 0, price: 280 }
};
const publicRateLimit = createPublicRateLimit;
const authRateLimit = () => createPublicRateLimit(10, 15 * 60 * 1000);
const bookingRateLimit = () => createPublicRateLimit(30, 15 * 60 * 1000);
const staffMutationRateLimit = () => createPublicRateLimit(120, 15 * 60 * 1000);
const metaServerTestRateLimit = () => createPublicRateLimit(1, 10 * 60 * 1000);

async function verifyTurnstile(req: Request) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  const token = typeof req.body?.turnstileToken === "string" ? req.body.turnstileToken : "";
  if (!secret || !token) {
    return process.env.NODE_ENV !== "production";
  }
  try {
    const response = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token, remoteip: req.ip }),
    });
    const result = await response.json() as { success?: boolean };
    return result.success === true;
  } catch (error) {
    console.error("Turnstile verification failed:", error instanceof Error ? error.message : "unknown error");
    return false;
  }
}

function verificationToken() {
  const token = crypto.randomBytes(32).toString("base64url");
  return {
    token,
    tokenHash: crypto.createHash("sha256").update(token).digest("hex"),
    expiresAt: new Date(Date.now() + 60 * 60 * 1000),
  };
}

async function sendVerificationForUser(req: Request, user: Pick<SafeUser, "id" | "email" | "locale">, discoveryPassClaimId?: string | null) {
  const generated = verificationToken();
  await storage.createEmailVerificationToken(user.id, generated.tokenHash, generated.expiresAt, discoveryPassClaimId);
  const locale = user.locale === "es" ? "es" : "en";
  const origin = `${req.protocol}://${req.get("host")}`;
  const path = locale === "es" ? "/es/portal/verify-email" : "/portal/verify-email";
  await sendEmailVerificationEmail({
    to: user.email,
    locale,
    verificationUrl: `${origin}${path}?token=${encodeURIComponent(generated.token)}`,
  });
}

export async function registerRoutes(app: Express): Promise<Server> {
  app.use("/api/portal/admin", staffMutationRateLimit());
  app.use("/api/admin", staffMutationRateLimit());
  app.use("/api/bookings", staffMutationRateLimit());
  registerAiManagementRoutes(app);
  registerClassBookingRoutes(app);
  registerMemberRoutes(app);

  // ============================================
  // SEO: robots.txt and sitemap.xml
  // ============================================
  app.get("/robots.txt", (_req, res) => {
    res.set("Content-Type", "text/plain").send(
       `User-agent: *\nAllow: /\nDisallow: /portal/\nDisallow: /admin\n\nSitemap: https://www.groundupbjj.com/sitemap.xml\n`
    );
  });

  app.get("/sitemap.xml", (_req, res) => {
    const today = new Date().toISOString().split("T")[0];
    res.set("Content-Type", "application/xml").send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://www.groundupbjj.com/</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>1.0</priority></url>
  <url><loc>https://www.groundupbjj.com/schedule</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.9</priority></url>
  <url><loc>https://www.groundupbjj.com/pricing</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.9</priority></url>
  <url><loc>https://www.groundupbjj.com/coaches</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>https://www.groundupbjj.com/personal-training</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>https://www.groundupbjj.com/contact</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>
  <url><loc>https://www.groundupbjj.com/privacy</loc><lastmod>${today}</lastmod><changefreq>yearly</changefreq><priority>0.3</priority></url>
  <url><loc>https://www.groundupbjj.com/book</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>1.0</priority></url>
  <url><loc>https://www.groundupbjj.com/womens-self-defense</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>https://www.groundupbjj.com/girls</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>https://www.groundupbjj.com/es</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>
  <url><loc>https://www.groundupbjj.com/es/programas</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.7</priority></url>
  <url><loc>https://www.groundupbjj.com/es/horario</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.7</priority></url>
  <url><loc>https://www.groundupbjj.com/es/reservar</loc><lastmod>${today}</lastmod><changefreq>weekly</changefreq><priority>0.8</priority></url>
  <url><loc>https://www.groundupbjj.com/es/contacto</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.6</priority></url>
  <url><loc>https://www.groundupbjj.com/es/privacidad</loc><lastmod>${today}</lastmod><changefreq>yearly</changefreq><priority>0.3</priority></url>
  <url><loc>https://www.groundupbjj.com/adaptive-capacity</loc><lastmod>${today}</lastmod><changefreq>monthly</changefreq><priority>0.8</priority></url>
</urlset>`);
  });

  app.get("/kids", (_req, res) => res.redirect(301, "/girls"));

  // ============================================
  // TRAINER ROUTES
  // ============================================
  app.get("/api/trainers", async (req, res) => {
    try {
      const trainers = await storage.getTrainers();
      res.json(trainers);
    } catch (error) {
      console.error("Error fetching trainers:", error);
      res.status(500).json({ message: "Failed to fetch trainers" });
    }
  });

  app.get("/api/trainers/:id", async (req, res) => {
    try {
      const trainer = await storage.getTrainer(req.params.id);
      if (!trainer) {
        return res.status(404).json({ message: "Trainer not found" });
      }
      res.json(trainer);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch trainer" });
    }
  });

  app.get("/api/trainers/:id/availability", async (req, res) => {
    try {
      const { date } = req.query;
      if (!date || typeof date !== 'string') {
        return res.status(400).json({ message: "Date parameter is required" });
      }

      const trainer = await storage.getTrainer(req.params.id);
      if (!trainer) {
        return res.status(404).json({ message: "Trainer not found" });
      }

      const selectedDate = parseISO(date);
      const dayName = format(selectedDate, 'EEEE');
      const dayAvailability = (trainer.availability as Record<string, string[]>)[dayName] || [];
      
      const startOfDay = new Date(selectedDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(selectedDate);
      endOfDay.setHours(23, 59, 59, 999);
      
      const existingBookings = await storage.getTrainerBookings(req.params.id, startOfDay, endOfDay);
      const bookedTimes = existingBookings.map(booking => format(booking.start, 'HH:mm'));
      const availableTimes = dayAvailability.filter((time: string) => !bookedTimes.includes(time));

      res.json({ availableTimes });
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch availability" });
    }
  });

  // ============================================
  // BOOKING ROUTES
  // ============================================
  app.get("/api/bookings", requireRole("admin", "coach"), async (req, res) => {
    try {
      const bookingsList = req.session.userRole === "admin"
        ? await storage.getBookings()
        : await storage.getBookings({ coachId: req.session.userId! });
      res.json(bookingsList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.post("/api/bookings", bookingRateLimit(), requireAuth, async (req, res) => {
    try {
      const bookingData = insertBookingSchema.parse(req.body);
      
      if (!SESSION_TYPES[bookingData.sessionType]) {
        return res.status(400).json({ message: "Invalid session type" });
      }

      const existingBookings = await storage.getTrainerBookings(
        bookingData.trainerId,
        new Date(bookingData.start),
        new Date(bookingData.end)
      );

      if (existingBookings.length > 0) {
        return res.status(400).json({ message: "Time slot is already booked" });
      }

      const booking = await storage.createUserBooking(req.session.userId!, bookingData);
      res.status(201).json(booking);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  app.put("/api/bookings/:id/status", requireRole("admin", "coach"), async (req, res) => {
    try {
      const { status, stripeSessionId } = req.body;
      if (!["pending", "paid", "canceled"].includes(status)) {
        return res.status(400).json({ message: "Invalid booking status" });
      }
      const booking = req.session.userRole === "admin"
        ? await storage.updateBookingStatus(req.params.id, status, stripeSessionId)
        : await storage.updateBookingStatusForCoach(req.params.id, req.session.userId!, status, stripeSessionId);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.json(booking);
    } catch (error) {
      res.status(500).json({ message: "Failed to update booking" });
    }
  });

  // ============================================
  // STRIPE ROUTES
  // ============================================
  app.get("/api/stripe/config", (_req, res) => {
    res.json({
      publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || null,
    });
  });

  app.get("/api/portal/admin/stripe/status", requireRole("admin"), async (_req, res) => {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY;
    const mode = secretKey?.startsWith("sk_test_")
      ? "test"
      : secretKey?.startsWith("sk_live_")
        ? "live"
        : secretKey
          ? "unknown"
          : "unconfigured";

    if (!stripe || !secretKey) {
      return res.json({
        configured: false,
        connected: false,
        mode,
        environmentConfigurationValid: stripeUsableInEnvironment,
        publishableKeyConfigured: Boolean(publishableKey),
        webhookConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      });
    }

    try {
      const account = await stripe.accounts.retrieve();
      return res.json({
        configured: true,
        connected: true,
        mode,
        environmentConfigurationValid: stripeUsableInEnvironment,
        publishableKeyConfigured: Boolean(publishableKey),
        webhookConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
        account: {
          id: account.id,
          country: account.country,
          defaultCurrency: account.default_currency,
          chargesEnabled: account.charges_enabled,
          payoutsEnabled: account.payouts_enabled,
        },
      });
    } catch {
      return res.status(502).json({
        configured: true,
        connected: false,
        mode,
        environmentConfigurationValid: stripeUsableInEnvironment,
        publishableKeyConfigured: Boolean(publishableKey),
        webhookConfigured: Boolean(process.env.STRIPE_WEBHOOK_SECRET),
      });
    }
  });

  app.post("/api/create-payment-intent", bookingRateLimit(), requireAuth, async (req, res) => {
    if (!stripe) {
      return res.status(500).json({ message: "Stripe is not configured" });
    }
    try {
      const { sessionType, bookingId } = req.body;
      const sessionConfig = SESSION_TYPES[sessionType];
      if (!sessionConfig) {
        return res.status(400).json({ message: "Invalid session type" });
      }
      if (bookingId) {
        const booking = await storage.getBooking(bookingId);
        if (!bookingBelongsToUser(booking, req.session.userId)) {
          return res.status(404).json({ message: "Booking not found" });
        }
      }
      const paymentIntent = await stripe.paymentIntents.create({
        amount: sessionConfig.price * 100,
        currency: "usd",
        metadata: { sessionType, bookingId: bookingId || "" },
      });
      res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
      console.error("Payment intent error:", error);
      res.status(500).json({ message: "Failed to create payment intent" });
    }
  });

  app.post("/api/stripe/webhook", express.raw({ type: "application/json", limit: "256kb" }), async (req, res) => {
    if (!stripe) {
      return res.status(503).json({
        code: process.env.NODE_ENV === "production" && stripeSecretMode !== "live"
          ? "STRIPE_LIVE_CONFIGURATION_REQUIRED"
          : "STRIPE_NOT_CONFIGURED",
        message: "Stripe webhook processing is unavailable.",
      });
    }
    const sig = req.headers['stripe-signature'] as string;
    if (!process.env.STRIPE_WEBHOOK_SECRET || !sig) {
      return res.status(400).json({ message: "Webhook signature is not configured" });
    }
    let event;
    try {
      event = verifyStripeSignature(stripe, req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
    } catch (err) {
      console.error("Stripe webhook signature verification failed:", err);
      return res.status(400).json({ message: "Invalid webhook signature" });
    }
    const expectedLiveMode = stripeSecretMode === "live";
    if (typeof event.livemode === "boolean" && event.livemode !== expectedLiveMode) {
      console.error("Stripe webhook mode mismatch; event rejected.");
      return res.status(400).json({ message: "Stripe webhook mode mismatch" });
    }
    if (!(await storage.startWebhookEvent("stripe", event.id))) {
      return res.json({ received: true, duplicate: true });
    }
    try {
      switch (event.type) {
        case 'payment_intent.succeeded': {
          const paymentIntent = event.data.object;
          const bookingId = paymentIntent.metadata.bookingId;
          if (bookingId) {
            const booking = await storage.getBooking(bookingId);
            if (!booking || booking.amountCents !== paymentIntent.amount || booking.currency.toLowerCase() !== paymentIntent.currency.toLowerCase()) {
              await storage.failWebhookEvent("stripe", event.id, "Payment intent does not match a known booking.", true);
              return res.status(400).json({ message: "Invalid payment reference" });
            }
            await storage.updateBookingStatus(bookingId, "paid", paymentIntent.id);
          }
          break;
        }
        case "checkout.session.expired": {
          const session = event.data.object as Stripe.Checkout.Session;
          if (session.mode === "subscription") {
            await expirePendingCheckoutSession(session.id);
          }
          break;
        }
        case "checkout.session.completed": {
          const session = event.data.object as Stripe.Checkout.Session;
          if (session.mode !== "subscription" || !session.subscription) break;
          const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription.id;
          let subscription = await stripe.subscriptions.retrieve(subscriptionId, {
            expand: ["items.data.price"],
          });
          if (!subscription.metadata?.ground_up_user_id && Object.keys(session.metadata || {}).length) {
            subscription = await stripe.subscriptions.update(subscription.id, {
              metadata: session.metadata || {},
            });
          }
          await applyStripeSubscription(subscription, {
            checkoutSessionId: session.id,
            latestInvoiceId: typeof subscription.latest_invoice === "string" ? subscription.latest_invoice : subscription.latest_invoice?.id,
          });
          break;
        }
        case "customer.subscription.created":
        case "customer.subscription.updated":
        case "customer.subscription.deleted": {
           const eventSubscription = event.data.object as Stripe.Subscription;
           const subscription = await stripe.subscriptions.retrieve(eventSubscription.id, {
             expand: ["items.data.price"],
           });
           await applyStripeSubscription(subscription);
          break;
        }
        case "invoice.paid": {
          const invoice = event.data.object as Stripe.Invoice;
          const subscription = invoice.parent?.subscription_details?.subscription;
          const subscriptionId = typeof subscription === "string" ? subscription : subscription?.id;
          if (subscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
              expand: ["items.data.price"],
            });
            await applyStripeSubscription(subscription, {
              latestInvoiceId: invoice.id,
            });
          }
          break;
        }
        case "invoice.payment_failed": {
          const invoice = event.data.object as Stripe.Invoice;
          const subscription = invoice.parent?.subscription_details?.subscription;
          const subscriptionId = typeof subscription === "string" ? subscription : subscription?.id;
          if (subscriptionId) {
            const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
              expand: ["items.data.price"],
            });
            await applyStripeSubscription(subscription, {
              latestInvoiceId: invoice.id,
              billingStateOverride: "past_due",
              billingFailureAt: new Date(),
            });
          }
          break;
        }
      }
      await storage.completeWebhookEvent("stripe", event.id);
    } catch (error) {
      await storage.failWebhookEvent("stripe", event.id, error instanceof Error ? error.message : "Stripe processing failed");
      console.error("Stripe webhook processing failed:", error);
      return res.status(500).json({ message: "Stripe webhook processing failed" });
    }
    res.json({ received: true });
  });

  // ============================================
  // CONTACT ROUTE
  // ============================================
  app.post(
    "/api/contact",
    publicRateLimit(8, 60 * 60 * 1000),
    publicRateLimit(4, 24 * 60 * 60 * 1000, (request) => hashClientSignal(String(request.body?.email || "").trim().toLowerCase())),
    async (req, res) => {
    try {
      const botReason = publicBotCheck(req);
      if (botReason) {
        console.warn("Public form blocked", { form: "contact", reason: botReason, ipHash: getRequestSignalHashes(req).ipHash });
        return res.status(400).json({ message: "Please complete the form normally and try again." });
      }
      if (!(await verifyTurnstile(req))) {
        return res.status(403).json({ message: "We could not verify this submission. Please try again." });
      }
      const { insertContactSubmissionSchema } = await import("@shared/schema");
      const parsed = insertContactSubmissionSchema.safeParse({
        ...req.body,
        source: req.body.source || "contact",
        consentedAt: req.body.consentedAt || null,
      });
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
      }
      const submission = await storage.createContactSubmission(parsed.data);
      const locale = req.body.locale === "es" ? "es" : "en";
      try {
        const notificationMessage = `${submission.firstName} ${submission.lastName} sent a ${submission.subject.toLowerCase()} message.`;
        const emailText = [
          "New contact message from the Ground Up website",
          "",
          `Name: ${submission.firstName} ${submission.lastName}`,
          `Email: ${submission.email}`,
          `Phone: ${submission.phone || "Not provided"}`,
          `Subject: ${submission.subject}`,
          "",
          "Message:",
          submission.message,
        ].join("\n");
        await storage.createStaffNotification({
          kind: "contact_message",
          title: "New contact message",
          message: notificationMessage,
          href: "/portal/admin?inbox=messages",
        });
        try {
          await sendStaffNotificationEmail({
            subject: `New Ground Up contact message: ${submission.subject}`,
            text: emailText,
            inboxPath: "/portal/admin?inbox=messages",
            replyTo: submission.email,
          });
        } catch (emailError) {
          console.error("Staff email failed for contact submission:", emailError);
        }
      } catch (notificationError) {
        console.error("Staff notification failed for contact submission:", notificationError);
      }
      try {
        await sendContactAcknowledgementEmail({
          to: submission.email,
          firstName: submission.firstName,
          subject: submission.subject,
          locale,
        });
      } catch (emailError) {
        console.error("Client email failed for contact submission:", emailError);
      }
      res.json({
        message: locale === "es"
          ? "Recibimos tu mensaje. Nuestro equipo te responderá dentro de 24 a 48 horas."
          : "We received your message. Our team will get back to you within 24–48 hours.",
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to send message" });
    }
  });

  // ============================================
  // TRIAL LEAD CAPTURE (public booking funnel)
  // ============================================
  app.post(
    "/api/trial-leads",
    publicRateLimit(8, 60 * 60 * 1000),
    publicRateLimit(4, 24 * 60 * 60 * 1000, (request) => hashClientSignal(String(request.body?.email || "").trim().toLowerCase())),
    async (req, res) => {
    try {
      const botReason = publicBotCheck(req);
      if (botReason) {
        console.warn("Public form blocked", { form: "trial_lead", reason: botReason, ipHash: getRequestSignalHashes(req).ipHash });
        return res.status(400).json({ message: "Please complete the form normally and try again." });
      }
      if (!(await verifyTurnstile(req))) {
        return res.status(403).json({ message: "We could not verify this submission. Please try again." });
      }
      const { insertTrialLeadSchema } = await import("@shared/schema");
      const parsed = insertTrialLeadSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ message: "Invalid data", errors: parsed.error.errors });
      }
      const lead = await storage.createTrialLead({
        ...parsed.data,
        program: parsed.data.program === "adaptive-capacity" ? "adaptive-capacity" : parsed.data.program,
        source: parsed.data.source || "training-book",
        consentedAt: parsed.data.consentedAt || new Date(),
      });
      const locale = req.body.locale === "es" ? "es" : "en";
      try {
        const adaptive = lead.program === "adaptive-capacity";
        const notificationTitle = adaptive ? "New Adaptive Capacity signup" : "New training lead";
        const notificationMessage = `${lead.firstName} ${lead.lastName} joined the ${adaptive ? "Adaptive Capacity interest list" : "training trial"} list.`;
        const inboxPath = `/portal/admin?inbox=${adaptive ? "adaptive" : "training"}`;
        const emailText = [
          notificationMessage,
          "",
          `Name: ${lead.firstName} ${lead.lastName}`,
          `Email: ${lead.email}`,
          `Phone: ${lead.phone}`,
          `Program: ${lead.program}`,
          lead.classTitle ? `Class: ${lead.classTitle}` : null,
          lead.classDay ? `Day: ${lead.classDay}` : null,
          lead.classTime ? `Time: ${lead.classTime}` : null,
          lead.childName ? `Child: ${lead.childName}${lead.childAge ? ` (${lead.childAge})` : ""}` : null,
          lead.source ? `Source: ${lead.source}` : null,
        ].filter(Boolean).join("\n");
        await storage.createStaffNotification({
          kind: adaptive ? "adaptive_lead" : "training_lead",
          title: notificationTitle,
          message: notificationMessage,
          href: inboxPath,
        });
        try {
          await sendStaffNotificationEmail({
            subject: `Ground Up: ${notificationTitle}`,
            text: emailText,
            inboxPath,
            replyTo: lead.email,
          });
        } catch (emailError) {
          console.error("Staff email failed for trial lead:", emailError);
        }
      } catch (notificationError) {
        console.error("Staff notification failed for trial lead:", notificationError);
      }
      try {
        await sendLeadAcknowledgementEmail({
          to: lead.email,
          firstName: lead.firstName,
          program: lead.program,
          classTitle: lead.classTitle,
          locale,
        });
      } catch (emailError) {
        console.error("Client email failed for trial lead:", emailError);
      }
      res.json({
        message: locale === "es"
          ? "Recibimos tu información. Nuestro equipo te responderá dentro de 24 a 48 horas."
          : "We received your information. Our team will get back to you within 24–48 hours.",
      });
    } catch (error) {
      console.error("Trial lead error:", error);
      res.status(500).json({ message: "Failed to save booking" });
    }
  });

  // Variant B intentionally records only a minimal prospect claim. It does
  // not create an account, password, pass, entitlement, waiver, or timer.
  app.post(
    "/api/discovery-pass/claim",
    publicRateLimit(5, 60 * 60 * 1000),
    publicRateLimit(4, 24 * 60 * 60 * 1000, (request) => hashClientSignal(String(request.body?.email || "").trim().toLowerCase())),
    async (req, res) => {
    const botReason = publicBotCheck(req);
    if (botReason) {
      console.warn("Public form blocked", { form: "discovery_claim", reason: botReason, ipHash: getRequestSignalHashes(req).ipHash });
      return res.status(400).json({ message: "Please complete the form normally and try again." });
    }
    if (!(await verifyTurnstile(req))) {
      return res.status(403).json({ message: "We could not verify this submission. Please try again." });
    }
    const parsed = discoveryPassClaimRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ message: "Please provide a first name, valid email, and optional valid phone number." });
    }
    try {
      const input = normalizeDiscoveryPassClaimInput(parsed.data);
      const result = await storage.createOrGetDiscoveryPassClaim(input);
      req.session.discoveryPassClaimId = result.claim.id;
      req.session.discoveryPassVariant = "B";
      return res.status(result.created ? 201 : 200).json({
        state: result.claim.continuationState,
        duplicate: !result.created,
      });
    } catch (error) {
      console.error("Discovery Pass Variant B claim error:", error);
      return res.status(500).json({ message: "We could not save your claim. Please try again." });
    }
  });

  app.get("/api/discovery-pass/claim-context", async (req, res) => {
    const claimId = req.session.discoveryPassClaimId;
    if (!claimId || req.session.discoveryPassVariant !== "B") {
      return res.status(404).json({ message: "No pending Discovery Pass claim" });
    }
    const claim = await storage.getDiscoveryPassClaim(claimId);
    if (!claim || claim.experimentVariant !== "B") {
      return res.status(404).json({ message: "No pending Discovery Pass claim" });
    }
    return res.json({
      firstName: claim.firstName,
      email: claim.email,
      phone: claim.phone || "",
      variant: "B",
    });
  });

  app.post("/api/discovery-pass/continue", async (req, res) => {
    const claimId = req.session.discoveryPassClaimId;
    if (!claimId || req.session.discoveryPassVariant !== "B") {
      return res.status(404).json({ message: "No pending Discovery Pass claim" });
    }
    const claim = await storage.markDiscoveryPassClaimContinuation(claimId);
    if (!claim) return res.status(404).json({ message: "No pending Discovery Pass claim" });
    return res.json({ state: claim.continuationState });
  });

  app.post("/api/analytics/events", publicRateLimit(), async (req, res) => {
    try {
      const { insertAnalyticsEventSchema } = await import("@shared/schema");
      const parsed = insertAnalyticsEventSchema.safeParse({
        event: req.body.event,
        funnel: req.body.funnel,
        sessionId: req.body.sessionId,
        path: req.body.path,
        properties: req.body.properties || {},
      });
      if (!parsed.success) return res.status(400).json({ message: "Invalid analytics event" });
      await storage.createAnalyticsEvent(parsed.data);
      res.status(204).end();
    } catch (error) {
      console.error("Analytics event error:", error);
      res.status(500).json({ message: "Failed to record analytics event" });
    }
  });

  app.post("/api/portal/admin/meta/test-event", requireRole("admin"), metaServerTestRateLimit(), async (req, res) => {
    const config = getMetaServerTestConfig();
    const configurationState = metaServerTestConfigurationState(config);
    if (configurationState === "disabled") {
      return res.status(404).json({ message: "Not found" });
    }
    if (configurationState === "unconfigured") {
      return res.status(503).json({ message: "Meta server test delivery is not configured" });
    }

    const parsed = z.object({
      consent: z.literal("granted"),
      locale: z.enum(["en", "es"]),
    }).strict().safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        message: "Explicit granted consent and a supported locale are required",
      });
    }

    const delivery = await deliverMetaDiscoveryTestEvent({
      config,
      locale: parsed.data.locale,
    });
    if (!delivery.accepted) {
      console.error(
        "Meta server test event was not accepted:",
        delivery.verification.eventsReceived,
      );
      return res.status(502).json({
        message: "Meta server test event was not accepted",
        verification: delivery.verification,
      });
    }

    return res.json(delivery.verification);
  });

  app.get("/api/portal/admin/campaign-report", requireRole("admin", "coach"), async (req, res) => {
    const funnel = req.query.funnel === "adaptive_capacity" ? "adaptive_capacity" : req.query.funnel === "training" ? "training" : null;
    if (!funnel) return res.status(400).json({ message: "funnel must be training or adaptive_capacity" });
    const clean = (key: string) => typeof req.query[key] === "string" ? (req.query[key] as string).trim().slice(0, 200) || undefined : undefined;
    const parseReportDate = (key: string) => {
      const value = clean(key);
      if (!value) return undefined;
      const date = new Date(value);
      return Number.isNaN(date.getTime()) ? null : date;
    };
    const from = parseReportDate("from");
    const to = parseReportDate("to");
    if (from === null || to === null || (from && to && to <= from)) {
      return res.status(400).json({ message: "from and to must be valid ISO dates with to after from" });
    }
    try {
      res.json(await storage.getCampaignReport({
        funnel,
        source: clean("source"),
        medium: clean("medium"),
        campaign: clean("campaign"),
        landingPath: clean("landingPath"),
        from: from || undefined,
        to: to || undefined,
        timezone: clean("timezone"),
      }));
    } catch (error) {
      console.error("Campaign report error:", error);
      res.status(500).json({ message: "Failed to build campaign report" });
    }
  });

  app.get("/api/portal/admin/discovery-funnel", requireRole("admin", "coach"), async (req, res) => {
    try {
      const days = typeof req.query.days === "string" ? Number(req.query.days) : undefined;
      const locale = req.query.locale === "en" || req.query.locale === "es" ? req.query.locale : undefined;
      const from = typeof req.query.from === "string" ? new Date(req.query.from) : undefined;
      const to = typeof req.query.to === "string" ? new Date(req.query.to) : undefined;
      if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime())) || (from && to && to <= from)) {
        return res.status(400).json({ message: "from and to must be valid ISO dates with to after from" });
      }
      res.json(await storage.getDiscoveryFunnelReport({ days, locale, from, to, timezone: typeof req.query.timezone === "string" ? req.query.timezone : undefined }));
    } catch (error) {
      console.error("Discovery funnel report error:", error);
      res.status(500).json({ message: "Failed to build Discovery Pass funnel report" });
    }
  });

  app.get("/api/portal/admin/discovery-ab-report", requireRole("admin", "coach"), async (req, res) => {
    try {
      const days = typeof req.query.days === "string" ? Number(req.query.days) : undefined;
      const from = typeof req.query.from === "string" ? new Date(req.query.from) : undefined;
      const to = typeof req.query.to === "string" ? new Date(req.query.to) : undefined;
      if ((from && Number.isNaN(from.getTime())) || (to && Number.isNaN(to.getTime())) || (from && to && to <= from)) {
        return res.status(400).json({ message: "from and to must be valid ISO dates with to after from" });
      }
      res.json(await storage.getDiscoveryAbReport({ days, from, to, timezone: typeof req.query.timezone === "string" ? req.query.timezone : undefined }));
    } catch (error) {
      console.error("Discovery A/B report error:", error);
      res.status(500).json({ message: "Failed to build Discovery Pass A/B report" });
    }
  });

  app.get("/api/portal/notifications", requireRole("admin", "coach"), async (_req, res) => {
    try {
      res.json(await storage.getStaffNotifications());
    } catch (error) {
      console.error("Staff notification fetch failed:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch("/api/portal/notifications/:id/read", requireRole("admin", "coach"), async (req, res) => {
    try {
      const notification = await storage.markStaffNotificationRead(req.params.id);
      if (!notification) return res.status(404).json({ message: "Notification not found" });
      res.json(notification);
    } catch (error) {
      console.error("Staff notification update failed:", error);
      res.status(500).json({ message: "Failed to update notification" });
    }
  });

  app.get("/api/portal/admin/trial-leads", requireRole("admin", "coach"), async (req, res) => {
    try {
      const program = req.query.program as string | undefined;
      if (program && !["training", "adaptive-capacity"].includes(program)) {
        return res.status(400).json({ message: "Invalid lead program" });
      }
      const leads = await storage.getTrialLeads(program === "training" ? undefined : program);
      const filtered = program === "training"
        ? leads.filter((lead) => lead.program !== "adaptive-capacity")
        : leads;
      res.json(filtered);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  app.patch("/api/portal/admin/trial-leads/:id/status", requireRole("admin", "coach"), async (req, res) => {
    const { leadStatuses } = await import("@shared/schema");
    if (!leadStatuses.includes(req.body.status)) {
      return res.status(400).json({ message: "Invalid lead status" });
    }
    try {
      const lead = await storage.updateTrialLeadStatus(req.params.id, req.body.status);
      if (!lead) return res.status(404).json({ message: "Lead not found" });
      res.json(lead);
    } catch (error) {
      res.status(500).json({ message: "Failed to update lead" });
    }
  });

  app.get("/api/portal/admin/contact-submissions", requireRole("admin"), async (_req, res) => {
    try {
      res.json(await storage.getContactSubmissions());
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch messages" });
    }
  });

  app.patch("/api/portal/admin/contact-submissions/:id/status", requireRole("admin"), async (req, res) => {
    const { contactStatuses } = await import("@shared/schema");
    if (!contactStatuses.includes(req.body.status)) {
      return res.status(400).json({ message: "Invalid message status" });
    }
    try {
      const submission = await storage.updateContactSubmissionStatus(req.params.id, req.body.status);
      if (!submission) return res.status(404).json({ message: "Message not found" });
      res.json(submission);
    } catch (error) {
      res.status(500).json({ message: "Failed to update message" });
    }
  });

  // ============================================
  // CALENDLY WEBHOOK
  // ============================================
  const calendlyWebhookSchema = z.object({
    event_id: z.string(),
    email: z.string().email(),
    event_type: z.string(),
    start_time: z.string().refine((value) => !Number.isNaN(Date.parse(value)), "Invalid start time"),
    payment_status: z.string().optional().default("pending"),
    amount: z.number().optional().default(2000),
  });

  app.post("/webhook/calendly", publicRateLimit(60), async (req, res) => {
    try {
      const rawBody = req.body;
      const signature = req.headers["calendly-webhook-signature"] as string | undefined;
      if (!process.env.CALENDLY_WEBHOOK_SIGNING_KEY) {
        return res.status(503).json({ message: "Calendly webhook is not configured" });
      }
      if (!verifyCalendlySignature(rawBody, signature, process.env.CALENDLY_WEBHOOK_SIGNING_KEY)) {
        return res.status(401).json({ message: "Invalid webhook signature" });
      }
      let payload = parseRawJsonBody(rawBody) as Record<string, any>;
      
      if (payload.event === "invitee.created" && payload.payload) {
        payload = {
          event_id: payload.payload.event?.uuid || payload.payload.uri || "",
          email: payload.payload.email || "",
          event_type: payload.payload.event?.name || "PT60",
          start_time: payload.payload.event?.start_time || payload.payload.scheduled_event?.start_time || new Date().toISOString(),
          payment_status: payload.payload.payment?.successful ? "paid" : "pending",
          amount: payload.payload.payment?.amount ? payload.payload.payment.amount * 100 : 2000,
        };
      }

      const validated = calendlyWebhookSchema.parse(payload);
      if (!(await storage.startWebhookEvent("calendly", validated.event_id))) {
        const existing = await storage.getBookingByCalendlyEventId(validated.event_id);
        return res.status(200).json({ message: "Webhook already processed", bookingId: existing?.id });
      }
      try {
        const booking = await storage.createCalendlyBooking({
          eventId: validated.event_id,
          email: validated.email,
          eventType: validated.event_type,
          startTime: new Date(validated.start_time),
          paymentStatus: validated.payment_status,
          amount: validated.amount,
        });
        await storage.completeWebhookEvent("calendly", validated.event_id);
        res.status(201).json({ message: "Booking created", bookingId: booking.id });
      } catch (error) {
        await storage.failWebhookEvent("calendly", validated.event_id, error instanceof Error ? error.message : "Calendly processing failed");
        throw error;
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid webhook payload", errors: error.errors });
      }
      console.error("Calendly webhook error:", error);
      res.status(500).json({ message: "Failed to process webhook" });
    }
  });

  // ============================================
  // PORTAL AUTHENTICATION ROUTES
  // ============================================
  app.post(
    "/api/portal/signup",
    publicRateLimit(8, 60 * 60 * 1000),
    publicRateLimit(4, 24 * 60 * 60 * 1000, (request) => hashClientSignal(String(request.body?.email || "").trim().toLowerCase())),
    async (req, res) => {
    try {
      const { email, password, firstName, lastName, phone } = req.body;
      const discoveryIntent = req.body?.discoveryIntent === true;
      const locale = req.body.locale === "es" ? "es" : "en";
      const pendingDiscoveryClaimId = req.session.discoveryPassClaimId;
      const botReason = publicBotCheck(req);
      if (botReason) {
        console.warn("Public form blocked", { form: "signup", reason: botReason, ipHash: getRequestSignalHashes(req).ipHash });
        return res.status(400).json({ message: "Please complete the form normally and try again." });
      }
      if (!(await verifyTurnstile(req))) {
        return res.status(403).json({ message: "We could not verify this account creation. Please try again." });
      }
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ message: "Email, password, first name, and last name are required" });
      }
      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const existingUser = await storage.getUserByEmail(normalizedEmail);
      if (existingUser) {
        if (!existingUser.emailVerifiedAt && existingUser.accountStatus !== "archived") {
          try { await sendVerificationForUser(req, existingUser, pendingDiscoveryClaimId); } catch (error) {
            console.error("Verification resend after duplicate signup failed:", error);
          }
        }
        return res.status(202).json({ message: "If this email can be used, we sent next steps to it." });
      }

      const signals = getRequestSignalHashes(req);
      const dayStart = new Date();
      dayStart.setHours(0, 0, 0, 0);
      const [ipCount, deviceCount] = await Promise.all([
        storage.countRecentSignupsBySignal("ip", signals.ipHash, dayStart),
        storage.countRecentSignupsBySignal("device", signals.deviceHash, dayStart),
      ]);
      if (ipCount >= 5 || deviceCount >= 5) {
        console.warn("Signup blocked", { reason: "daily_cap", ipHash: signals.ipHash, deviceHash: signals.deviceHash });
        return res.status(429).json({ message: "We could not create more accounts from this connection today." });
      }

      const riskReasons: string[] = [];
      const normalizedName = `${String(firstName).trim()} ${String(lastName).trim()}`;
      if (/[bcdfghjklmnpqrstvwxyz]{5,}/i.test(normalizedName) || /[^aeiou\s]{8,}/i.test(normalizedName)) {
        riskReasons.push("random-looking-name");
      }
      const domain = normalizedEmail.split("@")[1] || "";
      if (["mailinator.com", "guerrillamail.com", "10minutemail.com", "yopmail.com", "txt.att.net", "vtext.com", "tmomail.net", "messaging.sprintpcs.com"].includes(domain)) {
        riskReasons.push("disposable-or-sms-email");
      }
      const user = await storage.createUser(
        normalizedEmail,
        password,
        String(firstName).trim(),
        String(lastName).trim(),
        phone,
        locale,
        { ipHash: signals.ipHash, deviceHash: signals.deviceHash, accountStatus: riskReasons.length ? "needs_review" : "unverified", riskReasons },
      );
      if (pendingDiscoveryClaimId) {
        const linkedClaim = await storage.linkDiscoveryPassClaim(pendingDiscoveryClaimId, user.id, user.email);
        if (linkedClaim) {
          await storage.markDiscoveryOnboarding(user.id, "discovery_variant_b");
        }
      }
      if (discoveryIntent && !pendingDiscoveryClaimId) {
        await storage.markDiscoveryOnboarding(user.id, pendingDiscoveryClaimId ? "discovery_variant_b" : "discovery_funnel");
      }
      try {
        const verificationUser = await storage.getUserByEmail(user.email);
        if (verificationUser) await sendVerificationForUser(req, verificationUser, pendingDiscoveryClaimId);
      } catch (error) {
        console.error("Verification email failed after signup:", error);
      }
      res.status(201).json({
        verificationRequired: true,
        message: locale === "es"
          ? "Revisa tu correo para confirmar tu cuenta antes de continuar."
          : "Check your email to verify your account before continuing.",
      });
    } catch (error) {
      console.error("Signup error:", error);
      res.status(500).json({ message: "Failed to create account" });
    }
  });

  app.post("/api/portal/login", authRateLimit(), async (req, res) => {
    try {
      const { email, password } = req.body;
      const discoveryIntent = req.body?.discoveryIntent === true;
      const pendingDiscoveryClaimId = req.session.discoveryPassClaimId;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await storage.validateUserPassword(email, password);
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }
      if (user.accountStatus === "archived" || user.accountStatus === "suspicious") {
        return res.status(403).json({ code: "ACCOUNT_REVIEW_REQUIRED", message: "This account needs staff review before it can be used." });
      }
      if (!user.emailVerifiedAt) {
        try { await sendVerificationForUser(req, user); } catch (error) {
          console.error("Verification resend after login failed:", error);
        }
        return res.status(403).json({
          code: "EMAIL_VERIFICATION_REQUIRED",
          message: "Verify your email before signing in. We sent a new verification link if the account exists.",
        });
      }

      await new Promise<void>((resolve, reject) => req.session.regenerate((error) => error ? reject(error) : resolve()));
      req.session.userId = user.id;
      req.session.userRole = user.role;
      if (pendingDiscoveryClaimId) {
        const linkedClaim = await storage.linkDiscoveryPassClaim(pendingDiscoveryClaimId, user.id, user.email);
        if (linkedClaim) {
          req.session.discoveryPassClaimId = linkedClaim.id;
          req.session.discoveryPassVariant = "B";
        }
      }
      if (discoveryIntent || pendingDiscoveryClaimId) {
        await storage.markDiscoveryOnboarding(user.id, pendingDiscoveryClaimId ? "discovery_variant_b" : "discovery_funnel");
      }
      
      res.json({ user });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post(
    "/api/portal/email-verification/resend",
    publicRateLimit(5, 60 * 60 * 1000),
    publicRateLimit(3, 24 * 60 * 60 * 1000, (request) => hashClientSignal(String(request.body?.email || "").trim().toLowerCase())),
    async (req, res) => {
      const genericResponse = {
        message: "If an account matches that email, a verification link will be sent.",
      };
      try {
        const email = z.string().trim().email().max(254).parse(req.body?.email).toLowerCase();
        const user = await storage.getUserByEmail(email);
        if (user && !user.emailVerifiedAt && user.accountStatus !== "archived") {
          try { await sendVerificationForUser(req, user); } catch (error) {
            console.error("Verification resend failed:", error);
          }
        }
      } catch {
        // Always return the same response so email existence is not disclosed.
      }
      return res.status(202).json(genericResponse);
    },
  );

  app.post("/api/portal/email-verification/verify", async (req, res) => {
    try {
      const token = z.string().min(32).max(200).parse(req.body?.token);
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const user = await storage.consumeEmailVerificationToken(tokenHash);
      if (!user) return res.status(400).json({ message: "This verification link is invalid or expired." });
      await new Promise<void>((resolve, reject) => req.session.regenerate((error) => error ? reject(error) : resolve()));
      req.session.userId = user.id;
      req.session.userRole = user.role;
      const claim = await storage.getLinkedDiscoveryPassClaim(user.id);
      if (claim) {
        req.session.discoveryPassClaimId = claim.id;
        req.session.discoveryPassVariant = claim.experimentVariant === "B" ? "B" : undefined;
      }
      return res.json({ user });
    } catch {
      return res.status(400).json({ message: "This verification link is invalid or expired." });
    }
  });

  app.post("/api/portal/password-reset/request", authRateLimit(), async (req, res) => {
    const genericResponse = {
      message: "If an account matches that email, a password reset link will be sent.",
    };
    try {
      const email = z.string().trim().email().max(254).parse(req.body?.email).toLowerCase();
      const locale = req.body?.locale === "es" ? "es" : "en";
      const user = await storage.getUserByEmail(email);
      if (!user) return res.status(202).json(genericResponse);

      const token = crypto.randomBytes(32).toString("base64url");
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      await storage.createPasswordResetToken(user.id, tokenHash, new Date(Date.now() + 60 * 60 * 1000));
      const origin = `${req.protocol}://${req.get("host")}`;
      const resetPath = locale === "es" ? "/es/portal/reset-password" : "/portal/reset-password";
      try {
        await sendPasswordResetEmail({
          to: user.email,
          locale,
          resetUrl: `${origin}${resetPath}?token=${encodeURIComponent(token)}`,
        });
      } catch (error) {
        console.error("Password reset email failed:", error);
      }
      return res.status(202).json(genericResponse);
    } catch {
      return res.status(202).json(genericResponse);
    }
  });

  app.post("/api/portal/password-reset/complete", authRateLimit(), async (req, res) => {
    try {
      const { token, password } = z.object({
        token: z.string().min(32).max(200),
        password: z.string().min(8).max(200),
      }).strict().parse(req.body);
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const consumed = await storage.consumePasswordResetToken(tokenHash, password);
      if (!consumed) return res.status(400).json({ message: "This password reset link is invalid or expired." });
      req.session.destroy(() => undefined);
      return res.json({ message: "Password updated. You can now log in." });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Choose a password with at least 8 characters." });
      return res.status(400).json({ message: "This password reset link is invalid or expired." });
    }
  });

  app.post("/api/portal/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.clearCookie("connect.sid", { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production" });
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/portal/me", async (req, res) => {
    try {
      const userId = req.session?.userId;
      if (!userId) {
        return res.status(401).json({ message: "Not authenticated" });
      }

      const user = await storage.getUserById(userId);
      if (!user) {
        req.session.destroy(() => undefined);
        return res.status(401).json({ message: "User not found" });
      }
      if (!user.emailVerifiedAt) {
        return res.status(403).json({ code: "EMAIL_VERIFICATION_REQUIRED", message: "Verify your email before using the member portal." });
      }
      if (user.accountStatus === "suspicious" || user.accountStatus === "archived") {
        return res.status(403).json({ code: "ACCOUNT_REVIEW_REQUIRED", message: "This account needs staff review before using the member portal." });
      }

      const { passwordHash: _, ...safeUser } = user;
      res.json({ user: safeUser });
    } catch (error) {
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  app.patch("/api/portal/me/locale", requireAuth, async (req, res) => {
    try {
      const locale = z.enum(["en", "es"]).parse(req.body?.locale);
      const user = await storage.updateUser(req.session.userId!, { locale });
      if (!user) return res.status(404).json({ message: "User not found" });
      res.json({ user });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Invalid locale" });
      res.status(500).json({ message: "Failed to save language preference" });
    }
  });

  // ============================================
  // PORTAL FORMS ROUTES
  // ============================================
  app.get("/api/portal/forms", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const allForms = await storage.getForms();
      const userResponses = await storage.getUserFormResponses(userId);
      
      const formsWithStatus = allForms.map(form => {
        const response = userResponses.find(r => r.formId === form.id);
        return {
          ...form,
          responseStatus: response?.status || "not_started",
          responseId: response?.id
        };
      });

      res.json(formsWithStatus);
    } catch (error) {
      res.status(500).json({ message: "Failed to get forms" });
    }
  });

  app.get("/api/portal/forms/:slug", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const form = await storage.getFormBySlug(req.params.slug);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }
      const response = await storage.getFormResponse(userId, form.id);
      res.json({ form, response: response || null });
    } catch (error) {
      res.status(500).json({ message: "Failed to get form" });
    }
  });

  app.post("/api/portal/forms/:slug/save", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const form = await storage.getFormBySlug(req.params.slug);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }
      const { answers } = req.body;
      const response = await storage.saveFormResponse(userId, form.id, answers, "draft");
      res.json(response);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to save form" });
    }
  });

  app.post("/api/portal/forms/:slug/retake", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const form = await storage.getFormBySlug(req.params.slug);
      if (!form) return res.status(404).json({ message: "Form not found" });
      if (!form.retakeable) return res.status(403).json({ message: "This form cannot be retaken" });
      await storage.deleteFormResponse(userId, form.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ message: "Failed to reset form" });
    }
  });

  app.post("/api/portal/forms/:slug/submit", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const form = await storage.getFormBySlug(req.params.slug);
      if (!form) {
        return res.status(404).json({ message: "Form not found" });
      }
      const { answers } = req.body;
      await storage.saveFormResponse(userId, form.id, answers, "draft");
      const response = await storage.submitFormResponse(userId, form.id);
      res.json(response);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to submit form" });
    }
  });

  // ============================================
  // PORTAL BOOKING ROUTES
  // ============================================
  app.get("/api/portal/bookings", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const userBookings = await storage.getUserBookings(userId);
      res.json(userBookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to get bookings" });
    }
  });

  app.post("/api/portal/bookings", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const user = await storage.getUserById(userId);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      const { trainerId, sessionType, date, time, notes } = req.body;
      if (!trainerId || !sessionType || !date || !time) {
        return res.status(400).json({ message: "Trainer, session type, date, and time are required" });
      }

      const sessionConfig = SESSION_TYPES[sessionType];
      if (!sessionConfig) {
        return res.status(400).json({ message: "Invalid session type" });
      }

      const startDateTime = new Date(`${date}T${time}`);
      const endDateTime = addMinutes(startDateTime, sessionConfig.duration || 60);

      const existingBookings = await storage.getTrainerBookings(trainerId, startDateTime, endDateTime);
      if (existingBookings.length > 0) {
        return res.status(400).json({ message: "Time slot is not available" });
      }

      const booking = await storage.createUserBooking(userId, {
        trainerId,
        sessionType,
        start: startDateTime,
        end: endDateTime,
        customerName: `${user.firstName} ${user.lastName}`,
        customerEmail: user.email,
        customerPhone: user.phone || "",
        notes: notes || "",
        amountCents: sessionConfig.price * 100,
        currency: "usd",
        status: "pending"
      });

      res.status(201).json(booking);
    } catch (error) {
      res.status(500).json({ message: "Failed to create booking" });
    }
  });

  app.put("/api/portal/bookings/:id/cancel", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const booking = await storage.cancelUserBooking(userId, req.params.id);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.json(booking);
    } catch (error: any) {
      res.status(400).json({ message: error.message || "Failed to cancel booking" });
    }
  });

  // ============================================
  // ADMIN ROUTES
  // ============================================
  app.get("/api/portal/admin/stats", requireRole("admin"), async (req, res) => {
    try {
      const stats = await storage.getAdminStats();
      res.json(stats);
    } catch (error) {
      console.error("Get admin stats error:", error);
      res.status(500).json({ message: "Failed to get stats" });
    }
  });

  app.get("/api/portal/admin/members", requireRole("admin"), async (req, res) => {
    try {
      const search = req.query.search as string | undefined;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const incompleteFormsOnly = req.query.incompleteFormsOnly === "true";
      const result = await storage.getAllUsers(search, page, limit, incompleteFormsOnly);
      res.json(result);
    } catch (error) {
      res.status(500).json({ message: "Failed to get members" });
    }
  });

  app.get("/api/portal/admin/account-review", requireRole("admin"), async (req, res) => {
    try {
      const requested = typeof req.query.status === "string" ? req.query.status : undefined;
      const status = requested && ["unverified", "legitimate", "needs_review", "suspicious", "archived"].includes(requested)
        ? requested as AccountStatus
        : undefined;
      res.json({ users: await storage.getAccountReviewQueue(status) });
    } catch (error) {
      console.error("Get account review queue error:", error);
      res.status(500).json({ message: "Failed to get account review queue" });
    }
  });

  app.patch("/api/portal/admin/members/:id/account-status", requireRole("admin"), async (req, res) => {
    try {
      const status = z.enum(["legitimate", "suspicious", "archived", "needs_review"]).parse(req.body?.status);
      const reason = z.string().trim().min(3).max(500).parse(req.body?.reason || `Admin marked account ${status}.`);
      const user = await storage.updateAccountReview({
        userId: req.params.id,
        status,
        actorId: req.session.userId!,
        reason,
      });
      if (!user) return res.status(404).json({ message: "Member not found" });
      res.json({ user });
    } catch (error) {
      if (error instanceof z.ZodError) return res.status(400).json({ message: "Choose a valid account status and reason." });
      console.error("Update account status error:", error);
      res.status(500).json({ message: "Failed to update account status" });
    }
  });

  app.get("/api/portal/admin/members/:id", requireRole("admin"), async (req, res) => {
    try {
      const profile = await storage.getUserProfile(req.params.id);
      if (!profile) {
        return res.status(404).json({ message: "Member not found" });
      }
      res.json(profile);
    } catch (error) {
      res.status(500).json({ message: "Failed to get member profile" });
    }
  });

  app.put("/api/portal/admin/members/:id/notes", requireRole("admin"), async (req, res) => {
    try {
      const { notes } = req.body;
      if (typeof notes !== "string") {
        return res.status(400).json({ message: "Notes must be a string" });
      }
      const user = await storage.updateAdminNotes(req.params.id, notes);
      if (!user) {
        return res.status(404).json({ message: "Member not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to update notes" });
    }
  });

  app.put("/api/portal/admin/members/:id/role", requireRole("admin"), async (req, res) => {
    try {
      const { role } = req.body;
      if (!["admin", "coach", "member"].includes(role)) {
        return res.status(400).json({ message: "Invalid role" });
      }
      const user = await storage.updateUser(req.params.id, { role });
      if (!user) {
        return res.status(404).json({ message: "Member not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to update role" });
    }
  });

  app.put("/api/portal/admin/members/:id/belt", requireRole("admin", "coach"), async (req, res) => {
    try {
      if (req.session.userRole === "coach" && !coachCanManageMember(await storage.getUserById(req.params.id), req.session.userId)) {
        return res.status(404).json({ message: "Member not found" });
      }
      const { beltRank } = req.body;
      const user = await storage.updateUser(req.params.id, { beltRank });
      if (!user) {
        return res.status(404).json({ message: "Member not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to update belt rank" });
    }
  });

  app.put("/api/portal/admin/members/:id/attendance", requireRole("admin", "coach"), async (req, res) => {
    try {
      if (req.session.userRole === "coach" && !coachCanManageMember(await storage.getUserById(req.params.id), req.session.userId)) {
        return res.status(404).json({ message: "Member not found" });
      }
      const { attendanceCount } = req.body;
      const user = await storage.updateUser(req.params.id, { attendanceCount });
      if (!user) {
        return res.status(404).json({ message: "Member not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to update attendance" });
    }
  });

  app.get("/api/portal/admin/form-responses", requireRole("admin"), async (req, res) => {
    try {
      const responses = await storage.getAllFormResponses();
      res.json(responses);
    } catch (error) {
      res.status(500).json({ message: "Failed to get form responses" });
    }
  });

  app.get("/api/portal/admin/bookings", requireRole("admin"), async (req, res) => {
    try {
      const allBookings = await storage.getBookings();
      res.json(allBookings);
    } catch (error) {
      res.status(500).json({ message: "Failed to get bookings" });
    }
  });

  // ============================================
  // SESSION NOTES ROUTES (Admin & Coach)
  // ============================================
  app.get("/api/portal/session-notes/:userId", requireRole("admin", "coach"), async (req, res) => {
    try {
      if (req.session.userRole === "coach" && !coachCanManageMember(await storage.getUserById(req.params.userId), req.session.userId)) {
        return res.status(404).json({ message: "Member not found" });
      }
      const notes = await storage.getSessionNotes(req.params.userId);
      res.json(notes);
    } catch (error) {
      res.status(500).json({ message: "Failed to get session notes" });
    }
  });

  app.post("/api/portal/session-notes/:userId", requireRole("admin", "coach"), async (req, res) => {
    try {
      if (req.session.userRole === "coach" && !coachCanManageMember(await storage.getUserById(req.params.userId), req.session.userId)) {
        return res.status(404).json({ message: "Member not found" });
      }
      const coachId = req.session.userId!;
      const { notes, sessionDate } = req.body;
      if (!notes || typeof notes !== "string") {
        return res.status(400).json({ message: "Notes are required" });
      }
      const note = await storage.createSessionNote({
        userId: req.params.userId,
        coachId,
        notes,
        sessionDate: sessionDate ? new Date(sessionDate) : new Date(),
      });
      res.status(201).json(note);
    } catch (error) {
      res.status(500).json({ message: "Failed to create session note" });
    }
  });

  // ============================================
  // MEMBERSHIP ROUTES (Admin)
  // ============================================
  app.get("/api/portal/my-membership", requireAuth, async (req, res) => {
    try {
      const userId = (req.session as any).userId;
      const memberships = await storage.getMemberships(userId);
      const active = memberships.find(m => m.status === "active") || null;
      res.json(active);
    } catch (error) {
      res.status(500).json({ message: "Failed to get membership" });
    }
  });

  app.get("/api/portal/memberships/:userId", requireRole("admin"), async (req, res) => {
    try {
      const membershipsList = await storage.getMemberships(req.params.userId);
      res.json(membershipsList);
    } catch (error) {
      res.status(500).json({ message: "Failed to get memberships" });
    }
  });

  app.post("/api/portal/memberships", requireRole("admin"), async (req, res) => {
    try {
      const data = z.object({
        userId: z.string().uuid(),
        type: z.string().trim().min(1).max(80),
        planId: z.string().uuid().nullable().optional(),
        priceCents: z.number().int().nonnegative().optional(),
        endDate: z.string().datetime().nullable().optional(),
      }).strict().parse(req.body);
      const membership = await storage.createMembership({
        userId: data.userId,
        type: data.type,
        planId: data.planId ?? null,
        status: "active",
        priceCents: data.priceCents ?? 2000,
        startDate: new Date(),
        endDate: data.endDate ? new Date(data.endDate) : null,
        assignedBy: req.session.userId,
        source: "admin_assignment",
      });
      res.status(201).json(membership);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ code: "INVALID_REQUEST", errors: error.flatten() });
      }
      res.status(500).json({ message: "Failed to create membership" });
    }
  });

  // ============================================
  // COACH ROUTES
  // ============================================
  app.get("/api/portal/coach/members", requireRole("coach", "admin"), async (req, res) => {
    try {
      const coachId = req.session.userId!;
      const userRole = req.session.userRole;
      
      if (userRole === "admin") {
        const result = await storage.getAllUsers(undefined, 1, 100);
        return res.json(result.users);
      }
      
      const coachMembers = await storage.getCoachMembers(coachId);
      res.json(coachMembers);
    } catch (error) {
      res.status(500).json({ message: "Failed to get coach members" });
    }
  });

  // ============================================
  // LEGACY ADMIN ROUTES
  // ============================================
  app.post("/api/admin/login", requireRole("admin"), async (req, res) => {
    try {
      const { email, password } = req.body;
      const admin = await storage.getAdminUser(email);
      if (admin && admin.password === password) {
        res.json({ success: true, message: "Login successful" });
      } else {
        res.status(401).json({ message: "Invalid credentials" });
      }
    } catch (error) {
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.get("/api/admin/bookings", requireRole("admin", "coach"), async (req, res) => {
    try {
      const bookingsList = req.session.userRole === "admin"
        ? await storage.getBookings()
        : await storage.getBookings({ coachId: req.session.userId! });
      res.json(bookingsList);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch bookings" });
    }
  });

  app.put("/api/admin/bookings/:id/cancel", requireRole("admin", "coach"), async (req, res) => {
    try {
      const booking = req.session.userRole === "admin"
        ? await storage.cancelBooking(req.params.id)
        : await storage.cancelBookingForCoach(req.params.id, req.session.userId!);
      if (!booking) {
        return res.status(404).json({ message: "Booking not found" });
      }
      res.json(booking);
    } catch (error) {
      res.status(500).json({ message: "Failed to cancel booking" });
    }
  });

  app.put("/api/admin/trainers/:id/availability", requireRole("admin"), async (req, res) => {
    try {
      const { availability } = req.body;
      const trainer = await storage.updateTrainerAvailability(req.params.id, availability);
      if (!trainer) {
        return res.status(404).json({ message: "Trainer not found" });
      }
      res.json(trainer);
    } catch (error) {
      res.status(500).json({ message: "Failed to update availability" });
    }
  });

  for (const pagePath of Object.keys(PAGE_META)) {
    app.get(pagePath, serveWithMeta);
  }

  const httpServer = createServer(app);
  return httpServer;
}
