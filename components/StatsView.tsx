
import React from 'react';
import { UserStats, Badge } from '../types';
import { BADGES, getLeaderboard, calculateDailyScore } from '../services/gamification';
import { Trophy, Star, Clock, Target, Lock, Medal } from 'lucide-react';

interface StatsViewProps {
  stats: UserStats;
}

const StatsView: React.FC<StatsViewProps> = ({ stats }) => {
  const currentScore = calculateDailyScore(stats);
  const leaderboard = getLeaderboard(currentScore);
  const earnedBadgeIds = stats.badges;

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    return `${mins} 分钟`;
  };

  return (
    <div className="p-5 space-y-8 animate-in slide-in-from-right duration-500 pb-20">
      
      {/* Score Card */}
      <div className="relative bg-gradient-to-br from-indigo-600 to-purple-800 rounded-3xl p-6 text-white shadow-2xl overflow-hidden border border-white/10 group">
        <div className="absolute top-0 right-0 p-8 opacity-10 transform rotate-12 group-hover:rotate-0 transition-transform duration-700">
          <Trophy size={140} />
        </div>
        
        <div className="relative z-10">
          <div className="flex justify-between items-start mb-2">
             <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest">今日专注力评分</p>
             <div className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-[10px] font-bold">Level {Math.floor(stats.totalFocusTimeSeconds / 600) + 1}</div>
          </div>
          
          <div className="flex items-baseline gap-2 mt-2">
            <h2 className="text-7xl font-black tracking-tighter bg-gradient-to-b from-white to-indigo-200 bg-clip-text text-transparent drop-shadow-sm">
              {currentScore}
            </h2>
            <span className="text-xl font-medium text-indigo-300">/ 100</span>
          </div>

          <div className="mt-8 flex gap-3">
            <div className="flex-1 bg-black/20 backdrop-blur-md px-4 py-3 rounded-2xl flex flex-col justify-center border border-white/5">
              <div className="flex items-center gap-2 text-indigo-200 mb-1">
                <Clock size={14} />
                <span className="text-xs font-bold uppercase">专注时长</span>
              </div>
              <span className="text-lg font-bold">{formatTime(stats.totalFocusTimeSeconds)}</span>
            </div>
            
            <div className="flex-1 bg-black/20 backdrop-blur-md px-4 py-3 rounded-2xl flex flex-col justify-center border border-white/5">
              <div className="flex items-center gap-2 text-indigo-200 mb-1">
                <Target size={14} />
                 <span className="text-xs font-bold uppercase">分心次数</span>
              </div>
              <span className="text-lg font-bold">{stats.distractionCount} 次</span>
            </div>
          </div>
        </div>
      </div>

      {/* Badges Section */}
      <div>
        <div className="flex items-center justify-between mb-4 px-1">
           <h3 className="text-white font-bold text-lg flex items-center gap-2">
             <div className="p-1.5 rounded-lg bg-yellow-500/20">
               <Star className="text-yellow-400" size={16} fill="currentColor" />
             </div>
             成就徽章
           </h3>
           <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded-md">
             {earnedBadgeIds.length} / {BADGES.length}
           </span>
        </div>
        
        <div className="grid grid-cols-2 gap-3">
          {BADGES.map((badge) => {
            const isUnlocked = earnedBadgeIds.includes(badge.id);
            return (
              <div 
                key={badge.id}
                className={`relative overflow-hidden p-4 rounded-2xl border transition-all duration-300 group ${
                  isUnlocked 
                    ? 'bg-gradient-to-br from-gray-800 to-gray-800/50 border-yellow-500/30 shadow-lg shadow-yellow-500/5 hover:border-yellow-500/50' 
                    : 'bg-gray-900 border-gray-800/50 opacity-60'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className={`text-3xl filter ${isUnlocked ? 'drop-shadow-md' : 'grayscale contrast-50'}`}>
                    {badge.icon}
                  </div>
                  {!isUnlocked && <Lock size={14} className="text-gray-600" />}
                </div>
                
                <div>
                  <p className={`text-sm font-bold mb-1 ${isUnlocked ? 'text-gray-100' : 'text-gray-500'}`}>
                    {badge.name}
                  </p>
                  <p className="text-[10px] text-gray-500 leading-snug">
                    {badge.description}
                  </p>
                </div>
                
                {isUnlocked && (
                    <div className="absolute -bottom-4 -right-4 w-12 h-12 bg-yellow-500/20 blur-xl rounded-full"></div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="bg-gray-800/50 backdrop-blur-md rounded-3xl border border-white/5 overflow-hidden shadow-lg">
        <div className="p-5 border-b border-white/5 flex justify-between items-center bg-gray-800/50">
           <h3 className="text-white font-bold text-lg flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-orange-500/20">
               <Medal className="text-orange-400" size={16} />
            </div>
            好友排行
          </h3>
          <span className="text-[10px] font-bold text-gray-500 bg-black/20 px-2 py-1 rounded-md uppercase tracking-wide">Weekly</span>
        </div>
        <div className="divide-y divide-white/5">
          {leaderboard.map((entry, index) => (
            <div 
              key={entry.id}
              className={`flex items-center p-4 transition-colors ${
                entry.isCurrentUser ? 'bg-indigo-500/10 hover:bg-indigo-500/20' : 'hover:bg-white/5'
              }`}
            >
              <div className="w-8 font-bold text-center mr-2 flex justify-center">
                 {index === 0 && <span className="text-xl drop-shadow-sm">🥇</span>}
                 {index === 1 && <span className="text-xl drop-shadow-sm">🥈</span>}
                 {index === 2 && <span className="text-xl drop-shadow-sm">🥉</span>}
                 {index > 2 && <span className="text-sm text-gray-600 font-mono">#{index + 1}</span>}
              </div>
              
              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-lg mr-4 border-2 border-gray-600/50 shadow-sm relative">
                {entry.avatar}
                {entry.isCurrentUser && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-indigo-500 rounded-full border-2 border-gray-800"></div>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold truncate ${entry.isCurrentUser ? 'text-indigo-300' : 'text-gray-200'}`}>
                    {entry.name} {entry.isCurrentUser && '(我)'}
                </p>
                <p className="text-[10px] text-gray-500">
                    专注于 {Math.round(entry.score * 0.4)} 分钟
                </p>
              </div>
              
              <div className="text-right">
                  <span className="block font-black text-lg text-white leading-none">{entry.score}</span>
                  <span className="text-[10px] text-gray-500 uppercase font-bold">Points</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default StatsView;
