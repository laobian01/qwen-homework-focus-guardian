import React, { useState, useRef } from 'react';
import { Mic, Square, Play, Trash2, Save, Volume2 } from 'lucide-react';

interface VoiceRecorderProps {
  onSave: (audioBlob: string) => void; 
  existingAudio: string | null;
}

const VoiceRecorder: React.FC<VoiceRecorderProps> = ({ onSave, existingAudio }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(existingAudio);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      let options: MediaRecorderOptions | undefined = undefined;
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        options = { mimeType: 'audio/webm;codecs=opus' };
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };
      }
      
      const recorder = options ? new MediaRecorder(stream, options) : new MediaRecorder(stream);
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        const blobType = recorder.mimeType || 'audio/webm'; 
        const blob = new Blob(chunksRef.current, { type: blobType });
        const reader = new FileReader();
        reader.readAsDataURL(blob);
        reader.onloadend = () => {
          const base64data = reader.result as string;
          setAudioUrl(base64data);
          onSave(base64data);
        };
        stream.getTracks().forEach(track => track.stop());
      };

      recorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      alert("无法访问麦克风，请在手机浏览器设置中允许权限。");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const playRecording = () => {
    if (audioUrl) {
      const audio = new Audio(audioUrl);
      audio.play().catch(e => alert("播放失败: " + e.message));
    }
  };

  const deleteRecording = () => {
    setAudioUrl(null);
    onSave(""); 
  };

  return (
    <div className="bg-gray-800/60 backdrop-blur-md p-6 rounded-2xl border border-white/5 shadow-lg relative overflow-hidden">
      {/* Background Decor */}
      <div className="absolute -top-10 -right-10 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <h3 className="text-white font-bold mb-4 flex items-center gap-2 relative z-10">
        <div className="p-1.5 rounded-lg bg-blue-500/20">
            <Mic className="w-4 h-4 text-blue-400" />
        </div>
        自定义提醒语音
      </h3>
      
      <div className="space-y-4 relative z-10">
        {/* Main Action Button */}
        <div className="flex justify-center">
            {isRecording ? (
            <button
                onClick={stopRecording}
                className="w-full py-4 rounded-xl flex items-center justify-center gap-3 bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse transition-all"
            >
                <div className="p-1 bg-white/20 rounded-md">
                    <Square size={16} fill="currentColor" />
                </div>
                <span className="font-bold">停止录音</span>
            </button>
            ) : (
            <button
                onClick={startRecording}
                className={`w-full py-4 rounded-xl flex items-center justify-center gap-3 transition-all duration-300 font-bold ${
                    audioUrl 
                    ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                    : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 hover:scale-[1.02]'
                }`}
            >
                <Mic size={20} />
                <span>{audioUrl ? '重新录制' : '点击开始录制'}</span>
            </button>
            )}
        </div>

        {/* Audio Player Card */}
        {audioUrl && !isRecording && (
            <div className="bg-black/30 p-4 rounded-xl border border-white/5 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2">
            <button 
                onClick={playRecording} 
                className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white hover:bg-blue-400 transition-colors shadow-lg shadow-blue-500/30"
            >
                <Play size={18} fill="currentColor" className="ml-0.5" />
            </button>
            
            <div className="flex-1 flex flex-col justify-center gap-1">
                <span className="text-xs font-bold text-gray-300">已保存的录音</span>
                <div className="h-1 w-full bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full w-2/3 bg-blue-500 rounded-full"></div>
                </div>
            </div>

            <button 
                onClick={deleteRecording} 
                className="p-2 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                title="删除"
            >
                <Trash2 size={18} />
            </button>
            </div>
        )}
      </div>
      
      <div className="mt-5 p-3 rounded-lg bg-blue-500/5 border border-blue-500/10">
        <p className="text-[11px] text-gray-400 leading-relaxed flex gap-2">
            <Volume2 size={14} className="shrink-0 mt-0.5 text-blue-400" />
            <span>
                录制一段亲切的语音（如"宝贝加油"），当检测到分心时，APP会优先播放这段录音，而不是机器人的声音。
            </span>
        </p>
      </div>
    </div>
  );
};

export default VoiceRecorder;