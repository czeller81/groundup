import { Link } from "wouter";
import { Facebook, Instagram, Youtube } from "lucide-react";
import { siteConfig } from "../../../../site.config";

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid md:grid-cols-4 gap-8">
          <div className="md:col-span-2">
            <div className="text-2xl font-bold mb-4">Ground Up BJJ</div>
            <p className="text-gray-300 mb-6">
              Building champions from the ground up. Master Brazilian Jiu-Jitsu with personalized training from world-class instructors.
            </p>
            <div className="flex space-x-4">
              <a href={siteConfig.social.facebook} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white" data-testid="social-facebook">
                <Facebook className="h-5 w-5" />
              </a>
              <a href={siteConfig.social.instagram} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white" data-testid="social-instagram">
                <Instagram className="h-5 w-5" />
              </a>
              <a href={siteConfig.social.youtube} target="_blank" rel="noopener noreferrer" className="text-gray-300 hover:text-white" data-testid="social-youtube">
                <Youtube className="h-5 w-5" />
              </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li><Link href="/" className="text-gray-300 hover:text-white" data-testid="footer-link-home">Home</Link></li>
              <li><Link href="/personal-training" className="text-gray-300 hover:text-white" data-testid="footer-link-training">Personal Training</Link></li>
              <li><Link href="/coaches" className="text-gray-300 hover:text-white" data-testid="footer-link-coaches">Coaches</Link></li>
              <li><Link href="/pricing" className="text-gray-300 hover:text-white" data-testid="footer-link-pricing">Pricing</Link></li>
              <li><Link href="/contact" className="text-gray-300 hover:text-white" data-testid="footer-link-contact">Contact</Link></li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-lg font-semibold mb-4">Contact Info</h3>
            <ul className="space-y-2 text-gray-300">
              <li data-testid="footer-address">
                <div>{siteConfig.address.street}</div>
                <div>{siteConfig.address.city}, {siteConfig.address.state} {siteConfig.address.zip}</div>
              </li>
              <li data-testid="footer-phone">
                {siteConfig.phone}
              </li>
              <li data-testid="footer-email">
                {siteConfig.email}
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-300">
          <p>&copy; 2024 Ground Up BJJ. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
