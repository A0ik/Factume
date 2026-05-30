import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  href: string;
}

export function VisualBreadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Fil d'Ariane" className="text-sm text-gray-500 mb-8">
      <ol className="flex items-center flex-wrap gap-1">
        {items.map((item, i) => (
          <li key={item.href} className="flex items-center">
            {i > 0 && <ChevronRight className="w-4 h-4 mx-1 text-gray-400" />}
            {i === items.length - 1 ? (
              <span className="text-gray-900 font-medium">{item.label}</span>
            ) : (
              <Link href={item.href} className="hover:text-purple-600 transition-colors">
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
