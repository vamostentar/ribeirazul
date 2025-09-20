import { Project } from '@/types';

interface ProjectItemProps {
  project: Project;
  index: number;
}

export function ProjectItem({ project, index }: ProjectItemProps) {
  const delayClass = index < 10 ? `animate-delay-${(index + 1) * 100}` : '';
  
  return (
    <div 
      className={`flex items-center p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors animate-fade-in-up ${delayClass}`}
    >
      <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mr-4">
        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
      </div>
      <div>
        <h3 className="font-semibold text-gray-900">{project.name}</h3>
        <p className="text-sm text-gray-600 capitalize">{project.type}</p>
      </div>
    </div>
  );
}
