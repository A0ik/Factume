interface CardProps {
  children: React.ReactNode;
  className?: string;
}

/**
 * Card — dark-compatible
 *
 * Light mode: bg-white, shadow-sm, border-gray-100
 * Dark mode: bg-slate-900, border-white/5 (pas de shadow en dark)
 */
export default function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-xl shadow-sm dark:shadow-none border border-gray-100 dark:border-white/5 ${className}`}>
      {children}
    </div>
  );
}

Card.Content = function CardContent({ children, className = '' }: CardProps) {
  return <div className={`p-6 ${className}`}>{children}</div>;
};

Card.Header = function CardHeader({ children, className = '' }: CardProps) {
  return <div className={`px-6 pt-6 pb-4 ${className}`}>{children}</div>;
};

Card.Title = function CardTitle({ children, className = '' }: CardProps) {
  return <h3 className={`text-lg font-semibold text-gray-900 dark:text-white ${className}`}>{children}</h3>;
};
