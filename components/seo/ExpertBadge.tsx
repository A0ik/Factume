interface ExpertBadgeProps {
  name: string;
  title: string;
  organization: string;
}

export function ExpertBadge({ name, title, organization }: ExpertBadgeProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-blue-50 border border-blue-100 p-4 my-6">
      <div className="flex-shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-sm">
        {name.split(' ').map(n => n[0]).join('').slice(0, 2)}
      </div>
      <div>
        <p className="font-semibold text-sm text-gray-900">{name}</p>
        <p className="text-xs text-gray-600">{title} — {organization}</p>
      </div>
      <div className="ml-auto">
        <span className="inline-flex items-center px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
          Vérifié
        </span>
      </div>
    </div>
  );
}
