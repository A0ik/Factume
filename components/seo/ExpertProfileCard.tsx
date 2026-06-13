import { PersonSchema } from './PersonSchema';
import type { ExpertProfile } from '@/lib/experts-data';

/**
 * Rich expert profile card with PersonSchema structured data.
 * Used on the /experts page and in article author sections for E-E-A-T.
 */
export function ExpertProfileCard({ expert }: { expert: ExpertProfile }) {
  const initials = expert.name.split(' ').map((n) => n[0]).join('').slice(0, 2);

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-200 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start gap-5">
        {/* Avatar */}
        <div className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-xl sm:text-2xl">
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold text-gray-900">{expert.name}</h3>
          <p className="text-sm text-blue-600 font-semibold mb-2">{expert.jobTitle}</p>
          <p className="text-gray-600 text-sm leading-relaxed mb-3">{expert.bio}</p>

          {/* Credentials */}
          <div className="flex flex-wrap gap-2 mb-3">
            {expert.credentials.map((c, i) => (
              <span
                key={i}
                className="px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-full font-medium"
              >
                {c}
              </span>
            ))}
          </div>

          {/* Specialties */}
          <div className="flex flex-wrap gap-1.5">
            {expert.specialties.map((s, i) => (
              <span
                key={i}
                className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full"
              >
                {s}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* PersonSchema for structured data */}
      <PersonSchema
        name={expert.name}
        jobTitle={expert.jobTitle}
        url={`https://factu.me/experts#${expert.slug}`}
        description={expert.bio}
        worksFor={expert.worksFor}
        sameAs={expert.sameAs}
        knowsAbout={expert.knowsAbout}
      />
    </div>
  );
}
