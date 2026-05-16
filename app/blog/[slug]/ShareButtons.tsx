'use client';

import { useState } from 'react';
import { Twitter, Linkedin, Facebook, Link2, Check } from 'lucide-react';

interface ShareButtonsProps {
  title: string;
}

export function ShareButtons({ title }: ShareButtonsProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTitle = encodeURIComponent(title);

  const twitterUrl = `https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`;
  const linkedInUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`;
  const facebookUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = shareUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const buttons = [
    {
      name: 'Twitter',
      icon: Twitter,
      href: twitterUrl,
      bg: 'hover:bg-[#1DA1F2]/10 hover:text-[#1DA1F2] hover:border-[#1DA1F2]/30',
    },
    {
      name: 'LinkedIn',
      icon: Linkedin,
      href: linkedInUrl,
      bg: 'hover:bg-[#0A66C2]/10 hover:text-[#0A66C2] hover:border-[#0A66C2]/30',
    },
    {
      name: 'Facebook',
      icon: Facebook,
      href: facebookUrl,
      bg: 'hover:bg-[#1877F2]/10 hover:text-[#1877F2] hover:border-[#1877F2]/30',
    },
  ];

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {buttons.map(({ name, icon: Icon, href, bg }) => (
        <a
          key={name}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          title={`Partager sur ${name}`}
          className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-gray-200 dark:border-slate-700 text-sm font-medium text-gray-600 dark:text-gray-400 transition-all duration-200 ${bg}`}
        >
          <Icon className="w-4 h-4" />
          {name}
        </a>
      ))}
      <button
        onClick={handleCopyLink}
        title="Copier le lien"
        className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-medium transition-all duration-200 ${
          copied
            ? 'border-green-300 dark:border-green-700 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20'
            : 'border-gray-200 dark:border-slate-700 text-gray-600 dark:text-gray-400 hover:bg-primary/10 hover:text-primary hover:border-primary/30'
        }`}
      >
        {copied ? (
          <>
            <Check className="w-4 h-4" />
            Copie !
          </>
        ) : (
          <>
            <Link2 className="w-4 h-4" />
            Copier le lien
          </>
        )}
      </button>
    </div>
  );
}
