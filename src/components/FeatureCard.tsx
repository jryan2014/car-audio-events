import React from 'react';
import { LucideIcon, CheckCircle } from 'lucide-react';

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  benefits?: string[];
  iconColor?: 'electric' | 'purple';
  layout?: 'vertical' | 'horizontal';
}

export default function FeatureCard({
  icon: Icon,
  title,
  description,
  benefits,
  iconColor = 'electric',
  layout = 'horizontal'
}: FeatureCardProps) {
  if (layout === 'vertical') {
    return (
      <div className="text-center">
        <div className={`w-16 h-16 ${iconColor === 'electric' ? 'bg-electric-500/20' : 'bg-purple-500/20'} rounded-full flex items-center justify-center mx-auto mb-4`}>
          <Icon className={`h-8 w-8 ${iconColor === 'electric' ? 'text-electric-400' : 'text-purple-400'}`} />
        </div>
        <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-gray-400">{description}</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/50 rounded-xl p-8 border border-gray-700">
      <div className="flex items-start space-x-4">
        <div className="flex-shrink-0">
          <Icon className={`h-8 w-8 ${iconColor === 'electric' ? 'text-electric-400' : 'text-purple-400'}`} />
        </div>
        <div className="flex-1">
          <h3 className="text-2xl font-bold text-white mb-2">{title}</h3>
          <p className="text-gray-400 mb-4">{description}</p>
          {benefits && benefits.length > 0 && (
            <ul className="space-y-2">
              {benefits.map((benefit, idx) => (
                <li key={idx} className="flex items-center space-x-2">
                  <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
                  <span className="text-gray-300">{benefit}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}