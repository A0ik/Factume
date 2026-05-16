import Link from 'next/link';

interface RelatedPage {
  href: string;
  label: string;
}

export function RelatedPages({ pages }: { pages: RelatedPage[] }) {
  return (
    <div className="mt-12 pt-8 border-t border-gray-200">
      <h3 className="text-lg font-semibold mb-4">Pages similaires</h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {pages.map((page) => (
          <Link
            key={page.href}
            href={page.href}
            className="px-4 py-3 bg-gray-50 hover:bg-primary/5 rounded-lg text-sm text-gray-700 hover:text-primary transition-colors border border-gray-200 hover:border-primary/30"
          >
            {page.label}
          </Link>
        ))}
      </div>
    </div>
  );
}
