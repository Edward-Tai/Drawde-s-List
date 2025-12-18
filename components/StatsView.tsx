import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { AudioAsset, AssetType } from '../types';

interface StatsViewProps {
  assets: AudioAsset[];
}

const COLORS = ['#06b6d4', '#8b5cf6', '#ef4444', '#10b981', '#f97316'];

const StatsView: React.FC<StatsViewProps> = ({ assets }) => {
  const data = Object.values(AssetType).map((type) => ({
    name: type,
    value: assets.filter(a => a.type === type).length
  })).filter(item => item.value > 0);

  const totalAssets = assets.length;

  if (totalAssets === 0) return null;

  return (
    <div className="bg-studio-800 p-6 rounded-xl border border-studio-700 shadow-xl h-full flex flex-col transition-colors">
       <h2 className="text-xl font-bold text-studio-fg mb-4">資料庫統計</h2>
       <div className="flex-1 min-h-[250px] relative">
         <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
                fill="#8884d8"
                paddingAngle={5}
                dataKey="value"
                stroke="none"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgb(var(--studio-800))', borderColor: 'rgb(var(--studio-700))', borderRadius: '8px', color: 'rgb(var(--studio-fg))' }}
                itemStyle={{ color: 'rgb(var(--studio-fg))' }}
              />
              <Legend verticalAlign="bottom" height={36} wrapperStyle={{ color: 'rgb(var(--studio-muted))' }} />
            </PieChart>
         </ResponsiveContainer>
         <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-[60%] text-center pointer-events-none">
            <div className="text-3xl font-bold text-studio-fg">{totalAssets}</div>
            <div className="text-xs text-studio-muted">項目總數</div>
         </div>
       </div>
    </div>
  );
};

export default StatsView;