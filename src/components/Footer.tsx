import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Youtube, Mail, Phone } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { CreditCardLogos } from './CreditCardLogos';

interface CMSPage {
  id: string;
  title: string;
  slug: string;
  navigation_placement: 'none' | 'top_nav' | 'sub_nav' | 'footer';
  footer_section?: 'company' | 'quick_links' | 'legal' | 'support' | 'social';
  nav_order?: number;
  nav_title?: string;
  status: 'draft' | 'published' | 'archived';
}

// Anti-bot protection utilities
const obfuscateEmail = (email: string): string => {
  if (!email) return '';
  return email.replace('@', '&#64;').replace(/\./g, '&#46;');
};

const obfuscatePhone = (phone: string): string => {
  if (!phone) return '';
  return phone.replace(/0/g, '&#48;').replace(/1/g, '&#49;').replace(/5/g, '&#53;');
};

const createProtectedEmailLink = (email: string) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const decodedEmail = email.replace(/&#64;/g, '@').replace(/&#46;/g, '.');
    window.location.href = `mailto:${decodedEmail}`;
  };
  
  return {
    onClick: handleClick,
    href: '#'
  };
};

const createProtectedPhoneLink = (phone: string) => {
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    const cleanPhone = phone.replace(/[^\d+]/g, '');
    window.location.href = `tel:${cleanPhone}`;
  };
  
  return {
    onClick: handleClick,
    href: '#'
  };
};

export default function Footer() {
  const [footerPages, setFooterPages] = useState<{
    company: CMSPage[];
    quick_links: CMSPage[];
    legal: CMSPage[];
    support: CMSPage[];
    social: CMSPage[];
  }>({
    company: [],
    quick_links: [],
    legal: [],
    support: [],
    social: []
  });

  const [contactInfo, setContactInfo] = useState<{
    contact_email?: string;
    contact_phone?: string;
  }>({});

  useEffect(() => {
    loadFooterPages();
    loadContactInfo();
  }, []);

  const loadFooterPages = async () => {
    try {
      const { data, error } = await supabase
        .from('cms_pages')
        .select('id, title, slug, navigation_placement, footer_section, nav_order, nav_title, status')
        .eq('navigation_placement', 'footer')
        .eq('status', 'published')
        .order('nav_order', { ascending: true, nullsFirst: false })
        .order('title', { ascending: true });

      if (error) {
        console.error('Error loading footer pages:', error);
        return;
      }

      // Group pages by footer section
      const groupedPages: {
        company: CMSPage[];
        quick_links: CMSPage[];
        legal: CMSPage[];
        support: CMSPage[];
        social: CMSPage[];
      } = {
        company: [],
        quick_links: [],
        legal: [],
        support: [],
        social: []
      };

      data?.forEach(page => {
        const section = page.footer_section as keyof typeof groupedPages;
        if (section && groupedPages[section]) {
          groupedPages[section].push(page);
        }
      });

      setFooterPages(groupedPages);
    } catch (error) {
      console.error('Error loading footer pages:', error);
    }
  };

  const loadContactInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('organizations')
        .select('system_config')
        .eq('type', 'platform')
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading contact info:', error);
        return;
      }

      if (data?.system_config) {
        setContactInfo({
          contact_email: data.system_config.contact_email,
          contact_phone: data.system_config.contact_phone
        });
      }
    } catch (error) {
      console.error('Error loading contact info:', error);
    }
  };

  const renderDynamicLinks = (sectionPages: CMSPage[]) => {
    return sectionPages.map(page => (
      <Link 
        key={page.id}
        to={`/pages/${page.slug}`} 
        className="block text-gray-400 hover:text-electric-500 transition-colors text-sm"
      >
        {page.nav_title || page.title}
      </Link>
    ));
  };

  // Essential fallback links for when pages don't exist in CMS yet
  const renderEssentialLinks = (sectionPages: CMSPage[], sectionType: string) => {
    const existingSlugs = sectionPages.map(page => page.slug);
    const fallbackLinks = [];

    // Quick Links fallbacks
    if (sectionType === 'quick_links') {
      if (!existingSlugs.some(slug => slug.includes('events') || slug.includes('browse'))) {
        fallbackLinks.push(
          <Link key="events" to="/events" className="block text-gray-400 hover:text-electric-500 transition-colors text-sm">
            Browse Events
          </Link>
        );
      }
      if (!existingSlugs.some(slug => slug.includes('directory'))) {
        fallbackLinks.push(
          <Link key="directory" to="/directory" className="block text-gray-400 hover:text-electric-500 transition-colors text-sm">
            Directory
          </Link>
        );
      }
      if (!existingSlugs.some(slug => slug.includes('register') || slug.includes('join'))) {
        fallbackLinks.push(
          <Link key="register" to="/register" className="block text-gray-400 hover:text-electric-500 transition-colors text-sm">
            Join Community
          </Link>
        );
      }
    }

    // Support fallbacks
    if (sectionType === 'support') {
      if (!existingSlugs.some(slug => slug.includes('help') || slug.includes('faq'))) {
        fallbackLinks.push(
          <span key="help-placeholder" className="block text-gray-500 text-sm italic">
            Help Center (Create in CMS)
          </span>
        );
      }
    }

    return [...renderDynamicLinks(sectionPages), ...fallbackLinks];
  };

  const renderSection = (title: string, sectionKey: keyof typeof footerPages, showFallbacks = true) => {
    const pages = footerPages[sectionKey];
    const hasContent = pages.length > 0 || showFallbacks;

    if (!hasContent) return null;

    return (
      <div className="space-y-4">
        <h4 className="text-white font-semibold">{title}</h4>
        <div className="space-y-2">
          {showFallbacks ? renderEssentialLinks(pages, sectionKey) : renderDynamicLinks(pages)}
        </div>
      </div>
    );
  };

  return (
    <footer className="bg-black border-t border-electric-500/20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
          {/* Brand - Takes 2 columns on large screens */}
          <div className="space-y-4 lg:col-span-2">
            <img 
              src="/assets/logos/cae-logo-main.png" 
              alt="Car Audio Events" 
              className="h-16 w-auto"
            />
            <p className="text-gray-400 text-sm leading-relaxed">
              The ultimate platform for car audio competition enthusiasts. Connect, compete, and showcase your sound system.
            </p>
            <div className="flex space-x-4">
              <a href="#" className="text-gray-400 hover:text-electric-500 transition-colors" title="Facebook">
                <Facebook className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-electric-500 transition-colors" title="Twitter">
                <Twitter className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-electric-500 transition-colors" title="Instagram">
                <Instagram className="h-5 w-5" />
              </a>
              <a href="#" className="text-gray-400 hover:text-electric-500 transition-colors" title="YouTube">
                <Youtube className="h-5 w-5" />
              </a>
            </div>
            
            {/* Credit Card Logos */}
            <CreditCardLogos size="sm" className="mt-4" />
          </div>

          {/* Quick Links */}
          {renderSection("Quick Links", "quick_links")}
          
          {/* Support & Legal - Combined for better layout */}
          <div className="space-y-6">
            {renderSection("Support", "support")}
            {footerPages.legal.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-white font-semibold">Legal</h4>
                <div className="space-y-2">
                  {renderDynamicLinks(footerPages.legal)}
                </div>
              </div>
            )}
          </div>

          {/* Contact */}
          <div className="space-y-4">
            <h4 className="text-white font-semibold">Contact</h4>
            <div className="space-y-2">
              <div className="flex items-center space-x-2 text-gray-400 text-sm">
                <Mail className="h-4 w-4" />
                <span>
                  {contactInfo.contact_email ? (
                    <a 
                      {...createProtectedEmailLink(contactInfo.contact_email)} 
                      className="text-gray-400 hover:text-electric-500 transition-colors"
                      title="Click to send email"
                    >
                      {contactInfo.contact_email}
                    </a>
                  ) : (
                    <span className="text-gray-500 italic">
                      Configure contact email in admin settings
                    </span>
                  )}
                </span>
              </div>
              <div className="flex items-center space-x-2 text-gray-400 text-sm">
                <Phone className="h-4 w-4" />
                <span>
                  {contactInfo.contact_phone ? (
                    <a 
                      {...createProtectedPhoneLink(contactInfo.contact_phone)} 
                      className="text-gray-400 hover:text-electric-500 transition-colors"
                      title="Click to call"
                    >
                      {contactInfo.contact_phone}
                    </a>
                  ) : (
                    <span className="text-gray-500 italic">
                      Configure contact phone in admin settings
                    </span>
                  )}
                </span>
              </div>
            </div>
            <div className="pt-4">
              <h5 className="text-white font-medium text-sm mb-2">Newsletter</h5>
              <div className="flex">
                <input
                  type="email"
                  placeholder="Your email"
                  className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-l-lg text-white text-sm focus:outline-none focus:border-electric-500"
                />
                <button className="px-4 py-2 bg-electric-500 text-white rounded-r-lg hover:bg-electric-600 transition-all duration-200 text-sm font-medium">
                  Subscribe
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <p className="text-gray-400 text-sm">
              © {new Date().getFullYear()} Car Audio Events LLC. All rights reserved.
            </p>
            {footerPages.legal.length > 0 && (
              <div className="flex flex-wrap justify-center md:justify-end space-x-6">
                {renderDynamicLinks(footerPages.legal)}
              </div>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}