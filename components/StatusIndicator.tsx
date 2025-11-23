
import React from 'react';
import { FocusStatus } from '../types';
import { CheckCircle2, AlertTriangle, UserX, Activity, BrainCircuit } from 'lucide-react';

interface StatusIndicatorProps {
  status: FocusStatus;
  message?: string;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, message }) => {
  const getStatusConfig = () => {
    switch (status) {
      case FocusStatus.FOCUSED:
        return {
          bg: 'bg-green-500/10',
          border: 'border-green-500/30',
          iconBg: 'bg-green-500',
          shadow: 'shadow-green-500/20',
          icon: <CheckCircle2 className="w-8 h-8 text-white" />,
          label: '专注中',
          text: 'text-green-400',
          subtext: 'text-green-200/60'
        };
      case FocusStatus.DISTRACTED:
        return {
          bg: 'bg-red-500/10',
          border: 'border-red-500/30',
          iconBg: 'bg-red-500',
          shadow: 'shadow-red-500/20',
          icon: <AlertTriangle className="w-8 h-8 text-white" />,
          label: '分心了',
          text: 'text-red-400',
          subtext: 'text-red-200/60'
        };
      case FocusStatus.ABSENT:
        return {
          bg: 'bg-yellow-500/10',
          border: 'border-yellow-500/30',
          iconBg: 'bg-yellow-500',
          shadow: 'shadow-yellow-500/20',
          icon: <UserX className="w-8 h-8 text-white" />,
          label: '无人',
          text: 'text-yellow-400',
          subtext: 'text-yellow-200/60'
        };
      case FocusStatus.ERROR:
        return {
          bg: 'bg-gray-500/10',
          border: 'border-gray-500/30',
          iconBg: 'bg-gray-600',
          shadow: 'shadow-gray-500/20',
          icon: <AlertTriangle className="w-8 h-8 text-white" />,
          label: '连接错误',
          text: 'text-gray-400',
          subtext: 'text-gray-500'
        };
      default:
        return {
          bg: 'bg-blue-500/10',
          border: 'border-blue-500/30',
          iconBg: 'bg-blue-600',
          shadow: 'shadow-blue-500/20',
          icon: <BrainCircuit className="w-8 h-8 text-white" />,
          label: '等待开始',
          text: 'text-blue-400',
          subtext: 'text-blue-200/60'
        };
    }
  };

  const config = getStatusConfig();

  return (
    <div className={`flex items-center gap-5 w-full p-4 rounded-3xl border backdrop-blur-md transition-all duration-500 ${config.bg} ${config.border} shadow-lg ${config.shadow}`}>
      
      <div className={`relative flex items-center justify-center w-16 h-16 rounded-2xl ${config.iconBg} shadow-inner shrink-0 transition-colors duration-500`}>
        {config.icon}
        {status === FocusStatus.FOCUSED && (
           <div className="absolute inset-0 rounded-2xl animate-ping bg-green-400 opacity-20 duration-1000"></div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h2 className={`text-2xl font-bold tracking-tight ${config.text} transition-colors duration-300`}>
          {config.label}
        </h2>
        {message ? (
          <p className="mt-1 text-gray-300 text-sm opacity-90 truncate leading-relaxed">
            "{message}"
          </p>
        ) : (
          <p className={`mt-1 text-sm ${config.subtext}`}>
            AI 正在监看中...
          </p>
        )}
      </div>
    </div>
  );
};

export default StatusIndicator;
