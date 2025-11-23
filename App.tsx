
import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Play, Square, History, LayoutDashboard, Home, Settings, Trophy, Activity, SwitchCamera, Lock, Unlock, Crown, AlertCircle } from 'lucide-react';
import CameraFeed, { CameraHandle } from './components/CameraFeed';
import StatusIndicator from './components/StatusIndicator';
import StatsView from './components/StatsView';
import VoiceRecorder from './components/VoiceRecorder';
import { analyzeFrame } from './services/monitorService';
import { checkBadges } from './services/gamification';
import { FocusStatus, LogEntry, AnalysisResult, UserStats, Badge } from './types';

const CHECK_INTERVAL_MS = 5000;
const DAILY_LIMIT_SECONDS = 20 * 60; // 20 Minutes Free Limit
const ACTIVATION_CODE = "VIP888"; // Set your secret code here

type ViewMode = 'monitor' | 'stats' | 'settings';

function App() {
  const cameraRef = useRef<CameraHandle>(null);
  
  // App State
  const [view, setView] = useState<ViewMode>('monitor');
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [status, setStatus] = useState<FocusStatus>(FocusStatus.IDLE);
  const [lastMessage, setLastMessage] = useState<string>("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Camera State
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');

  // Pro / Limit State
  const [isPro, setIsPro] = useState(false);
  const [dailyUsage, setDailyUsage] = useState(0);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [inputCode, setInputCode] = useState("");

  // Gamification State
  const [stats, setStats] = useState<UserStats>({
    totalFocusTimeSeconds: 0,
    currentStreakSeconds: 0,
    longestStreakSeconds: 0,
    distractionCount: 0,
    badges: []
  });
  const [newBadge, setNewBadge] = useState<Badge | null>(null);

  // Settings State
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [customAudio, setCustomAudio] = useState<string | null>(null);
  const [useCustomAudio, setUseCustomAudio] = useState(false);
  
  const timerRef = useRef<number | null>(null);
  const usageTimerRef = useRef<number | null>(null);
  const lastCheckTimeRef = useRef<number>(Date.now());
  const voicesRef = useRef<SpeechSynthesisVoice[]>([]);

  // Initialize: Load Settings & Daily Usage
  useEffect(() => {
    // Load Voices
    const loadVoices = () => {
      voicesRef.current = window.speechSynthesis.getVoices();
    };
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
    
    // Load Custom Audio
    const savedAudio = localStorage.getItem('custom_audio_blob');
    if (savedAudio) {
      setCustomAudio(savedAudio);
      setUseCustomAudio(true);
    }

    // Load Pro Status
    const savedIsPro = localStorage.getItem('focus_guardian_is_pro');
    if (savedIsPro === 'true') setIsPro(true);

    // Load Daily Usage
    const today = new Date().toDateString();
    const savedDate = localStorage.getItem('focus_guardian_last_date');
    const savedUsage = localStorage.getItem('focus_guardian_daily_usage');

    if (savedDate === today && savedUsage) {
      setDailyUsage(parseInt(savedUsage, 10));
    } else {
      // New day, reset usage
      localStorage.setItem('focus_guardian_last_date', today);
      localStorage.setItem('focus_guardian_daily_usage', '0');
      setDailyUsage(0);
    }
  }, []);

  // Persist usage when it changes
  useEffect(() => {
    localStorage.setItem('focus_guardian_daily_usage', dailyUsage.toString());
  }, [dailyUsage]);

  // Activation Handler
  const handleActivate = () => {
    if (inputCode.trim().toUpperCase() === ACTIVATION_CODE) {
      setIsPro(true);
      localStorage.setItem('focus_guardian_is_pro', 'true');
      alert("激活成功！感谢支持，您已解锁无限专注时长。");
      setInputCode("");
      setShowLimitModal(false);
    } else {
      alert("激活码错误，请联系客服获取。");
    }
  };

  const handleSaveAudio = (audioData: string) => {
    setCustomAudio(audioData);
    if (audioData) {
      localStorage.setItem('custom_audio_blob', audioData);
      setUseCustomAudio(true);
    } else {
      localStorage.removeItem('custom_audio_blob');
      setUseCustomAudio(false);
    }
  };

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  // Modified speak function to accept an optional status override
  const speak = useCallback((text: string, overrideStatus?: FocusStatus) => {
    if (!audioEnabled) return;

    const currentStatus = overrideStatus || status;

    // Custom Audio Logic: Only play for negative states
    if (useCustomAudio && customAudio && (currentStatus === FocusStatus.DISTRACTED || currentStatus === FocusStatus.ABSENT)) {
       const audio = new Audio(customAudio);
       audio.play().catch(e => console.error("Audio play failed", e));
       return;
    }

    // TTS Logic
    if (!window.speechSynthesis) return;
    
    // Cancel any ongoing speech
    if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'zh-CN'; 
    
    // Improved Voice Selection Logic
    const voices = voicesRef.current.length > 0 ? voicesRef.current : window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
        v.lang.includes('zh') && (v.name.includes('Google') || v.name.includes('Microsoft') || v.name.includes('Siri') || v.name.includes('Tingting'))
    ) || voices.find(v => v.lang.includes('zh'));

    if (preferredVoice) {
        utterance.voice = preferredVoice;
    }

    // Adjust pitch and rate for a friendlier tone
    utterance.rate = 0.95; // Slightly slower
    utterance.pitch = 1.05; // Slightly higher/brighter
    
    window.speechSynthesis.speak(utterance);
  }, [audioEnabled, useCustomAudio, customAudio, status]);

  const updateStats = (newStatus: FocusStatus) => {
    setStats(prev => {
      const now = Date.now();
      const elapsedSeconds = (now - lastCheckTimeRef.current) / 1000;
      lastCheckTimeRef.current = now;

      const validElapsed = elapsedSeconds > 20 ? 0 : Math.min(elapsedSeconds, 10);

      let newStats = { ...prev };

      if (newStatus === FocusStatus.FOCUSED) {
        newStats.totalFocusTimeSeconds += Math.floor(validElapsed);
        newStats.currentStreakSeconds += Math.floor(validElapsed);
        if (newStats.currentStreakSeconds > newStats.longestStreakSeconds) {
          newStats.longestStreakSeconds = newStats.currentStreakSeconds;
        }
      } else if (newStatus === FocusStatus.DISTRACTED || newStatus === FocusStatus.ABSENT) {
        newStats.currentStreakSeconds = 0;
        newStats.distractionCount += 1;
      }

      const earnedBadge = checkBadges(newStats, newStats.badges);
      if (earnedBadge) {
        newStats.badges = [...newStats.badges, earnedBadge.id];
        setNewBadge(earnedBadge);
        setTimeout(() => setNewBadge(null), 4000);
        
        if (audioEnabled) {
          // Use a simple direct call for badges to ensure it plays
          const u = new SpeechSynthesisUtterance(`恭喜！获得了徽章：${earnedBadge.name}`);
          u.lang = 'zh-CN';
          window.speechSynthesis.speak(u);
        }
      }

      return newStats;
    });
  };

  const performCheck = useCallback(async () => {
    if (!cameraRef.current) return;

    lastCheckTimeRef.current = Date.now();

    // captureFrame now returns null if camera isn't ready, preventing invalid API calls
    const frameBase64 = cameraRef.current.captureFrame();
    
    if (!frameBase64) {
        // Skip this cycle if camera isn't ready
        console.warn("Camera frame not ready");
        return;
    }

    try {
      const result: AnalysisResult = await analyzeFrame(frameBase64);
      
      setStatus(result.status);
      setLastMessage(result.message);
      updateStats(result.status);
      
      if (result.status !== FocusStatus.ERROR) {
        setLogs(prev => [{
            id: Date.now().toString(),
            timestamp: new Date(),
            status: result.status,
            message: result.message
        }, ...prev].slice(0, 50));
      }

      // Explicitly pass the NEW status to speak, because setStatus is async and 'status' variable is stale here
      if (result.status === FocusStatus.DISTRACTED || result.status === FocusStatus.ABSENT) {
        speak(result.message, result.status);
      } else if (result.status === FocusStatus.FOCUSED) {
        if (Math.random() > 0.85) {
           speak(result.message, result.status);
        }
      }

    } catch (err) {
      console.error("Check failed", err);
      // Optional: handle visual error state if needed
    }
  }, [speak]); // speak is now stable dependency

  // Monitor Limit and Stop if Exceeded
  useEffect(() => {
      if (isMonitoring && !isPro && dailyUsage >= DAILY_LIMIT_SECONDS) {
          setIsMonitoring(false);
          setShowLimitModal(true);
          speak("今日免费时长已用完，请激活专业版");
      }
  }, [dailyUsage, isMonitoring, isPro, speak]);

  useEffect(() => {
    if (isMonitoring) {
      lastCheckTimeRef.current = Date.now();
      performCheck(); 
      timerRef.current = window.setInterval(performCheck, CHECK_INTERVAL_MS);
      
      // Usage Timer (counts every second)
      usageTimerRef.current = window.setInterval(() => {
        setDailyUsage(prev => prev + 1);
      }, 1000);

    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      if (usageTimerRef.current) {
        clearInterval(usageTimerRef.current);
        usageTimerRef.current = null;
      }
      setStatus(FocusStatus.IDLE);
      setLastMessage("");
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (usageTimerRef.current) clearInterval(usageTimerRef.current);
    };
  }, [isMonitoring, performCheck]);

  const toggleMonitoring = () => {
    if (!isMonitoring && !isPro && dailyUsage >= DAILY_LIMIT_SECONDS) {
        setShowLimitModal(true);
        return;
    }

    const nextState = !isMonitoring;
    setIsMonitoring(nextState);
    
    if (nextState) {
        speak("开始监控，小朋友加油哦", FocusStatus.FOCUSED);
    }
  };

  // Dynamic background based on status
  const getBackgroundClass = () => {
    switch (status) {
      case FocusStatus.FOCUSED: return 'from-gray-900 via-green-900/20 to-gray-900';
      case FocusStatus.DISTRACTED: return 'from-gray-900 via-red-900/20 to-gray-900';
      case FocusStatus.ABSENT: return 'from-gray-900 via-yellow-900/20 to-gray-900';
      default: return 'from-gray-900 via-blue-900/10 to-gray-900';
    }
  };

  return (
    // FIX: Use 100dvh (Dynamic Viewport Height) to properly handle iOS Safari address bar resizing
    <div className={`flex flex-col h-[100dvh] w-full max-w-md mx-auto bg-gradient-to-b ${getBackgroundClass()} transition-colors duration-700 ease-in-out shadow-2xl overflow-hidden relative font-sans text-gray-100`}>
      
      {/* Limit Modal */}
      {showLimitModal && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in">
          <div className="bg-gray-900 border border-yellow-500/30 rounded-3xl p-6 w-full max-w-sm shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 via-red-500 to-yellow-500"></div>
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 rounded-full bg-yellow-500/20 flex items-center justify-center mb-2">
                <Crown size={32} className="text-yellow-500" />
              </div>
              <h3 className="text-xl font-bold text-white">免费时长已用完</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                每日免费体验时长为 20 分钟。激活专业版即可解锁无限时长，并支持更多高级功能。
              </p>
              
              <div className="w-full bg-gray-800 p-3 rounded-xl border border-white/10 mt-2">
                 <p className="text-xs text-gray-500 mb-2">请输入激活码</p>
                 <div className="flex gap-2">
                    <input 
                      type="text" 
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value)}
                      placeholder="输入 VIP 激活码"
                      className="flex-1 bg-black/30 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-yellow-500"
                    />
                    <button 
                      onClick={handleActivate}
                      className="bg-yellow-600 hover:bg-yellow-500 text-white px-4 py-2 rounded-lg text-sm font-bold transition-colors"
                    >
                      解锁
                    </button>
                 </div>
              </div>
              
              <div className="text-xs text-gray-500 pt-2">
                <p>还没有激活码？</p>
                <p className="text-yellow-500 font-medium mt-1">请联系客服微信购买硬件支架免费获取</p>
              </div>

              <button 
                onClick={() => setShowLimitModal(false)}
                className="text-gray-500 hover:text-white text-xs mt-4 underline"
              >
                暂不激活，明天再来
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="px-5 py-4 bg-gray-900/60 backdrop-blur-xl z-20 flex justify-between items-center border-b border-white/5 sticky top-0 shrink-0">
        <div className="flex items-center gap-2">
           <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
             <Activity size={18} className="text-white" />
           </div>
           <div>
             <h1 className="text-lg font-bold bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">
              专注卫士
            </h1>
            {isPro ? (
                <span className="text-[10px] text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded border border-yellow-500/20 ml-1">PRO</span>
            ) : (
                <span className="text-[10px] text-gray-500 bg-gray-800 px-1.5 py-0.5 rounded border border-gray-700 ml-1">FREE</span>
            )}
           </div>
        </div>
        <div className="flex items-center gap-3">
            {/* Usage Timer for Free Users */}
            {!isPro && (
                <div className="flex items-center gap-1.5 bg-gray-800 px-2 py-1 rounded-full border border-white/5">
                   <div className={`w-1.5 h-1.5 rounded-full ${dailyUsage >= DAILY_LIMIT_SECONDS ? 'bg-red-500' : 'bg-green-500'} animate-pulse`}></div>
                   <span className={`text-[10px] font-mono ${dailyUsage >= DAILY_LIMIT_SECONDS * 0.8 ? 'text-red-400' : 'text-gray-400'}`}>
                     {Math.floor(DAILY_LIMIT_SECONDS / 60 - dailyUsage / 60)}m left
                   </span>
                </div>
            )}
            
            {stats.badges.length > 0 && (
                <div className="flex items-center gap-1.5 bg-yellow-500/10 px-3 py-1.5 rounded-full border border-yellow-500/20 shadow-sm">
                    <Trophy size={14} className="text-yellow-500"/>
                    <span className="text-xs font-bold text-yellow-500">{stats.badges.length}</span>
                </div>
            )}
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 relative flex flex-col overflow-hidden">
        
        {/* Badge Notification Toast */}
        {newBadge && (
            <div className="absolute top-4 left-4 right-4 z-50 animate-in slide-in-from-top duration-500">
                <div className="bg-gray-800/90 backdrop-blur-md p-4 rounded-2xl shadow-2xl border border-yellow-500/30 flex items-center gap-4 ring-1 ring-white/10">
                    <div className="text-4xl animate-bounce filter drop-shadow-lg">{newBadge.icon}</div>
                    <div>
                        <h4 className="font-bold text-yellow-400 text-lg">解锁新成就!</h4>
                        <p className="text-gray-300 text-sm">{newBadge.name}</p>
                    </div>
                </div>
            </div>
        )}

        {view === 'monitor' && (
          <div className="flex flex-col h-full p-4 space-y-4">
            
            {/* Camera Section - Enlarged */}
            <div className="relative w-full h-[50vh] bg-black rounded-3xl overflow-hidden shadow-2xl border border-white/10 group shrink-0">
              <CameraFeed ref={cameraRef} onError={(err) => setErrorMsg(err)} facingMode={facingMode} />
              
              {/* Overlay Gradient */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none"></div>

              {/* Camera Controls Overlay */}
              <div className="absolute top-4 right-4 z-20 flex flex-col gap-3">
                 {isMonitoring && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/10 shadow-lg">
                        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]"></div>
                        <span className="text-[10px] font-bold text-white tracking-wider">LIVE</span>
                    </div>
                 )}
                 <button 
                    onClick={toggleCamera}
                    className="p-2.5 rounded-full bg-black/40 backdrop-blur-md border border-white/10 text-white hover:bg-white/10 active:scale-90 transition-all shadow-lg"
                 >
                    <SwitchCamera size={18} />
                 </button>
              </div>
              
              {errorMsg && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/90 z-30 p-8 text-center backdrop-blur-sm">
                    <p className="text-red-400 font-medium bg-red-500/10 px-4 py-2 rounded-lg border border-red-500/20">{errorMsg}</p>
                </div>
              )}
            </div>

            {/* Status & Controls - Flex to fill remaining space */}
            <div className="flex-1 flex flex-col space-y-4 min-h-0">
              <div className="shrink-0">
                  <StatusIndicator status={status} message={lastMessage} />
              </div>
              
              <div className="flex justify-center shrink-0">
                  <button
                    onClick={toggleMonitoring}
                    className={`
                      relative group flex items-center justify-center gap-3 px-8 py-4 rounded-full font-bold text-lg shadow-xl transition-all duration-300 active:scale-95 w-full max-w-[200px]
                      ${isMonitoring 
                        ? 'bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30' 
                        : 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white border border-transparent shadow-blue-500/20'
                      }
                    `}
                  >
                    {isMonitoring ? (
                      <>
                        <Square className="w-5 h-5 fill-current" />
                        <span className="tracking-wide">停止</span>
                      </>
                    ) : (
                      <>
                        <Play className="w-5 h-5 fill-current" />
                        <span className="tracking-wide">开始</span>
                      </>
                    )}
                  </button>
              </div>

              {/* Log View - Scrollable area filling rest of space */}
              <div className="flex-1 bg-gray-800/40 backdrop-blur-sm rounded-2xl border border-white/5 overflow-hidden flex flex-col min-h-0">
                 <div className="flex items-center gap-2 px-4 py-2 bg-white/5 border-b border-white/5 shrink-0">
                   <History size={14} className="text-gray-400" />
                   <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">实时日志</span>
                 </div>
                 <div className="flex-1 overflow-y-auto p-3 space-y-2 custom-scrollbar">
                   {logs.length === 0 ? (
                     <p className="text-center text-gray-600 text-xs mt-2 italic">暂无记录...</p>
                   ) : (
                     logs.map((log) => (
                       <div key={log.id} className="flex items-start gap-3 text-xs animate-in fade-in slide-in-from-left-2 duration-300">
                         <span className="font-mono text-gray-500 min-w-[50px]">{log.timestamp.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit',second:'2-digit'})}</span>
                         <span className={`font-medium ${
                           log.status === FocusStatus.DISTRACTED ? 'text-red-400' : 
                           log.status === FocusStatus.FOCUSED ? 'text-green-400' : 'text-gray-300'
                         }`}>
                            {log.message}
                         </span>
                       </div>
                   )))}
                 </div>
              </div>
            </div>
          </div>
        )}

        {view === 'stats' && (
            <div className="h-full overflow-y-auto custom-scrollbar">
                <StatsView stats={stats} />
            </div>
        )}

        {view === 'settings' && (
            <div className="h-full overflow-y-auto custom-scrollbar">
                <div className="p-5 space-y-6 animate-in fade-in duration-300 pb-24">
                    <h2 className="text-2xl font-bold text-white mb-2">设置</h2>
                    
                    {/* --- PRO ACTIVATION CARD --- */}
                    <div className={`relative p-6 rounded-2xl overflow-hidden border ${isPro ? 'bg-gradient-to-br from-gray-800 to-gray-900 border-yellow-500/30' : 'bg-gradient-to-br from-yellow-600 to-yellow-800 border-yellow-400/50'}`}>
                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2 rounded-xl ${isPro ? 'bg-yellow-500/20' : 'bg-white/20'}`}>
                                        {isPro ? <Unlock className="text-yellow-500" /> : <Lock className="text-white" />}
                                    </div>
                                    <div>
                                        <h3 className={`font-bold text-lg ${isPro ? 'text-yellow-500' : 'text-white'}`}>
                                            {isPro ? '专业版已激活' : '解锁专业版'}
                                        </h3>
                                        <p className={`text-xs ${isPro ? 'text-gray-400' : 'text-yellow-100'}`}>
                                            {isPro ? '您已拥有无限监控时长' : '解除每日 20 分钟限制'}
                                        </p>
                                    </div>
                                </div>
                                {isPro && <Crown className="text-yellow-500 opacity-50" size={40} />}
                            </div>

                            {!isPro && (
                                <div className="bg-black/20 backdrop-blur-md rounded-xl p-4 space-y-3">
                                    <div className="flex gap-2">
                                        <input 
                                            type="text" 
                                            value={inputCode}
                                            onChange={(e) => setInputCode(e.target.value)}
                                            placeholder="请输入激活码"
                                            className="flex-1 bg-white/10 border border-white/20 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/50 focus:outline-none focus:bg-white/20"
                                        />
                                        <button 
                                            onClick={handleActivate}
                                            className="bg-white text-yellow-700 font-bold px-4 rounded-lg text-sm hover:bg-yellow-50 transition-colors"
                                        >
                                            激活
                                        </button>
                                    </div>
                                    <div className="flex items-start gap-2 text-xs text-yellow-100/80 bg-white/10 p-2 rounded-lg">
                                        <AlertCircle size={14} className="shrink-0 mt-0.5" />
                                        <p>
                                            获取方式：请添加客服微信 <span className="font-bold text-white select-all">FocusHelp</span>，购买专用支架免费获赠永久激活码。
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                        {/* Background Pattern */}
                        <div className="absolute -bottom-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
                    </div>

                    {/* Audio Toggle */}
                    <div className="bg-gray-800/60 backdrop-blur-md p-5 rounded-2xl border border-white/5 flex items-center justify-between shadow-lg">
                        <div className="space-y-1">
                            <h3 className="font-bold text-gray-100">语音提示</h3>
                            <p className="text-xs text-gray-400">开启后 AI 会语音提醒小朋友专注</p>
                        </div>
                        <button 
                            onClick={() => setAudioEnabled(!audioEnabled)}
                            className={`w-14 h-8 rounded-full transition-all duration-300 relative focus:outline-none focus:ring-2 focus:ring-blue-500/50 ${audioEnabled ? 'bg-blue-600 shadow-inner' : 'bg-gray-700'}`}
                        >
                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full shadow-md transition-all duration-300 ${audioEnabled ? 'left-7' : 'left-1'}`}></div>
                        </button>
                    </div>

                    {/* Custom Voice Recorder */}
                    <div className={`transition-opacity duration-300 ${!audioEnabled ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
                        <VoiceRecorder 
                            existingAudio={customAudio} 
                            onSave={handleSaveAudio} 
                        />
                    </div>
                    
                    <div className="mt-8 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                        <p className="text-xs text-blue-300/80 text-center leading-relaxed">
                            Tip: 建议将手机放置在侧前方，以便 AI 能清楚地看到小朋友写作业的状态。如果听不到声音，请检查手机是否开启了静音模式（如 iPhone 左侧的物理开关）。
                        </p>
                    </div>
                </div>
            </div>
        )}

      </main>

      {/* Bottom Navigation */}
      <nav className="bg-gray-900/80 backdrop-blur-xl border-t border-white/5 h-20 flex items-center justify-around absolute bottom-0 w-full z-40 pb-safe shadow-[0_-10px_40px_rgba(0,0,0,0.5)]">
        <button 
            onClick={() => setView('monitor')}
            className={`group flex flex-col items-center justify-center w-full h-full space-y-1.5 transition-colors relative ${view === 'monitor' ? 'text-blue-400' : 'text-gray-500 hover:text-gray-300'}`}
        >
            <div className={`p-1.5 rounded-xl transition-all duration-300 ${view === 'monitor' ? 'bg-blue-500/10 scale-110' : 'group-hover:bg-white/5'}`}>
              <Home size={22} strokeWidth={view === 'monitor' ? 2.5 : 2} />
            </div>
            <span className="text-[10px] font-medium tracking-wide">监控</span>
        </button>
        <button 
            onClick={() => setView('stats')}
            className={`group flex flex-col items-center justify-center w-full h-full space-y-1.5 transition-colors relative ${view === 'stats' ? 'text-indigo-400' : 'text-gray-500 hover:text-gray-300'}`}
        >
            <div className={`p-1.5 rounded-xl transition-all duration-300 ${view === 'stats' ? 'bg-indigo-500/10 scale-110' : 'group-hover:bg-white/5'}`}>
              <LayoutDashboard size={22} strokeWidth={view === 'stats' ? 2.5 : 2} />
            </div>
            <span className="text-[10px] font-medium tracking-wide">成就</span>
        </button>
        <button 
            onClick={() => setView('settings')}
            className={`group flex flex-col items-center justify-center w-full h-full space-y-1.5 transition-colors relative ${view === 'settings' ? 'text-gray-100' : 'text-gray-500 hover:text-gray-300'}`}
        >
            <div className={`p-1.5 rounded-xl transition-all duration-300 ${view === 'settings' ? 'bg-white/10 scale-110' : 'group-hover:bg-white/5'}`}>
              <Settings size={22} strokeWidth={view === 'settings' ? 2.5 : 2} />
            </div>
            <span className="text-[10px] font-medium tracking-wide">设置</span>
        </button>
      </nav>
    </div>
  );
}

export default App;
