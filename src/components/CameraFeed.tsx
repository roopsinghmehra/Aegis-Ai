import React, { useRef, useEffect, useState } from 'react';
import { detectionEngine } from '../services/detectionEngine';
import { CameraConfig, DetectionSettings, Point } from '../types';
import { Shield, ShieldAlert, Activity, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface CameraFeedProps {
  config: CameraConfig;
  settings: DetectionSettings;
  onEvent: (type: string, confidence: number, imageData: string) => void;
}

export const CameraFeed: React.FC<CameraFeedProps> = ({ config, settings, onEvent }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [lastDetection, setLastDetection] = useState<string | null>(null);
  const prevFrameRef = useRef<ImageData | null>(null);
  const lastEventTime = useRef<number>(0);

  const rtspUrl = `rtsp://${config.username && config.password ? `${config.username}:${config.password}@` : ''}${config.ip || '0.0.0.0'}:${config.port || '554'}/unicast/c${config.channel || 1}/s${config.streamType ?? 0}/live`;

  useEffect(() => {
    let animationFrame: number;
    let frameCount = 0;

    const processFrame = async () => {
      if (!videoRef.current || !canvasRef.current || videoRef.current.paused) {
        animationFrame = requestAnimationFrame(processFrame);
        return;
      }

      frameCount++;
      // Process at the configured frame rate
      if (frameCount % Math.floor(60 / settings.frameRate) !== 0) {
        animationFrame = requestAnimationFrame(processFrame);
        return;
      }

      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) return;

      // Draw video to canvas for processing
      ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
      const currentFrame = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      let shouldRunAI = true;
      if (settings.enableMotionDetection) {
        shouldRunAI = detectionEngine.detectMotion(currentFrame, prevFrameRef.current, settings.motionSensitivity);
      }
      
      prevFrameRef.current = currentFrame;

      if (shouldRunAI) {
        setIsDetecting(true);
        const detections = await detectionEngine.detect(canvas);
        
        // Filter for security relevant objects
        const securityDetections = detections.filter(d => 
          ['person', 'car', 'truck', 'bus', 'motorcycle', 'dog', 'cat', 'bird'].includes(d.class) &&
          d.score >= settings.confidenceThreshold
        );

        if (securityDetections.length > 0) {
          const now = Date.now();
          if (now - lastEventTime.current > settings.alertCooldown * 1000) {
            const bestDetection = securityDetections[0];
            setLastDetection(bestDetection.class);
            lastEventTime.current = now;
            
            // Capture screenshot
            const imageData = canvas.toDataURL('image/jpeg', 0.7);
            onEvent(bestDetection.class, bestDetection.score, imageData);
          }
        } else {
          setLastDetection(null);
        }
        setIsDetecting(false);
      } else {
        setLastDetection(null);
      }

      animationFrame = requestAnimationFrame(processFrame);
    };

    processFrame();
    return () => cancelAnimationFrame(animationFrame);
  }, [settings, onEvent]);

  return (
    <div className="relative aspect-video bg-black rounded-lg overflow-hidden border border-line/20 group">
      {/* Mocking RTSP with a placeholder video or camera feed */}
      <video
        ref={videoRef}
        src="https://assets.mixkit.co/videos/preview/mixkit-security-camera-in-a-parking-lot-4026-large.mp4"
        className="w-full h-full object-cover opacity-80"
        autoPlay
        muted
        loop
        playsInline
      />
      
      <canvas ref={canvasRef} className="hidden" width="320" height="180" />

      {/* Overlay UI */}
      <div className="absolute top-0 left-0 w-full p-3 flex justify-between items-start bg-gradient-to-b from-black/60 to-transparent">
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${config.enabled ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
          <span className="text-[10px] font-mono text-white uppercase tracking-widest">{config.name}</span>
        </div>
        <div className="flex gap-2">
          {isDetecting && <Activity size={14} className="text-accent animate-pulse" />}
          <Maximize2 size={14} className="text-white/60 hover:text-white cursor-pointer transition-colors" />
        </div>
      </div>

      <AnimatePresence>
        {lastDetection && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="absolute bottom-3 left-3 bg-accent text-white px-2 py-1 rounded text-[10px] font-bold uppercase flex items-center gap-1 shadow-lg"
          >
            <ShieldAlert size={12} />
            {lastDetection} DETECTED
          </motion.div>
        )}
      </AnimatePresence>

      {/* Technical Grid Overlay */}
      <div className="absolute inset-0 pointer-events-none border border-white/5 grid grid-cols-4 grid-rows-4">
        {[...Array(16)].map((_, i) => (
          <div key={i} className="border-[0.5px] border-white/5" />
        ))}
      </div>
    </div>
  );
};
