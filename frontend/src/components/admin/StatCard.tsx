import { TrendingUp } from 'lucide-react';
import React from 'react';

interface StatCardProps {
  icon: React.ComponentType<any>;
  title: string;
  value: string | number;
  change?: number;
  color: string;
}

export default function StatCard({ icon: Icon, title, value, change, color }: StatCardProps) {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-gray-600 text-sm font-medium">{title}</p>
          <p className="text-2xl font-bold text-gray-800 mt-1">{value}</p>
          {change !== undefined && (
            <div className={`flex items-center mt-2 text-sm ${change > 0 ? 'text-green-600' : 'text-red-600'}`}>
              <TrendingUp size={16} className="mr-1" />
              {change > 0 ? '+' : ''}{change}% este mês
            </div>
          )}
        </div>
        <div className={`p-3 rounded-full ${color}`}>
          <Icon size={24} className="text-white" />
        </div>
      </div>
    </div>
  );
}
