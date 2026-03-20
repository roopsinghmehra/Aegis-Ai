import React, { useState, useEffect, useCallback } from 'react';
import { Shield, LayoutGrid, History, Settings, Camera, Bell, Menu, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CameraFeed } from './components/CameraFeed';
import { EventHistory } from './components/EventHistory';
import { SettingsPanel } from './components/SettingsPanel';
import { CameraConfigScreen } from './components/CameraConfigScreen';
import { AppScreen, SecurityEvent, CameraConfig, DetectionSettings } from './types';
import { detectionEngine } from './services/detectionEngine';

const INITIAL_CAMERAS: CameraConfig[] = [
  { id: 'cam-01', name: 'Front Entrance', ip: '', port: '554', username: '', password: '', channel: 1, streamType: 0, enabled: true, zones: [] },
  { id: 'cam-02', name: 'Driveway North', ip: '', port: '554', username: '', password: '', channel: 1, streamType: 0, enabled: true, zones: [] },
  { id: 'cam-03', name: 'Backyard Perimeter', ip: '', port: '554', username: '', password: '', channel: 1, streamType: 0, enabled: true, zones: [] },
];

const DEFAULT_SETTINGS: DetectionSettings = {
  confidenceThreshold: 0.5,
  motionSensitivity: 30,
  frameRate: 5,
  enableMotionDetection: true,
  alertCooldown: 30,
};

export default function App() {
  const [screen, setScreen] = useState<AppScreen>('dashboard');
  const [events, setEvents] = useState<SecurityEvent[]>([]);
  const [cameras, setCameras] = useState<CameraConfig[]>(INITIAL_CAMERAS);
  const [settings, setSettings] = useState<DetectionSettings>(DEFAULT_SETTINGS);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isModelLoaded, setIsModelLoaded] = useState(false);

  useEffect(() => {
    const init = async () => {
      await detectionEngine.init();
      setIsModelLoaded(true);
      
      // Fetch initial data
      try {
        const [eventsRes, settingsRes, camerasRes] = await Promise.all([
          fetch('/api/events'),
          fetch('/api/settings'),
          fetch('/api/cameras')
        ]);
        
        if (eventsRes.ok) setEvents(await eventsRes.json());
        if (camerasRes.ok) {
          const cams = await camerasRes.json();
          if (cams && cams.length > 0) setCameras(cams);
        }
      } catch (err) {
        console.error('Failed to fetch initial data', err);
      }
    };
    init();
  }, []);

  const handleNewEvent = useCallback(async (cameraId: string, type: string, confidence: number, imageData: string) => {
    const newEvent = {
      camera_id: cameraId,
      object_type: type,
      confidence,
      image_data: imageData
    };

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newEvent)
      });
      
      if (res.ok) {
        const updatedEvents = await fetch('/api/events').then(r => r.json());
        setEvents(updatedEvents);
        
        // Browser notification
        if (Notification.permission === 'granted') {
          new Notification(`Security Alert: ${type.toUpperCase()}`, {
            body: `Detected at ${cameraId} with ${(confidence * 100).toFixed(0)}% confidence.`,
            icon: imageData
          });
        }
      }
    } catch (err) {
      console.error('Failed to save event', err);
    }
  }, []);

  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const handleSaveCameras = async (newCameras: CameraConfig[]) => {
    try {
      const res = await fetch('/api/cameras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCameras)
      });
      if (res.ok) {
        setCameras(newCameras);
        setScreen('dashboard');
      }
    } catch (err) {
      console.error('Failed to save cameras', err);
    }
  };

  const NavItem = ({ id, icon: Icon, label }: { id: AppScreen, icon: any, label: string }) => (
    <button
      onClick={() => { setScreen(id); setIsSidebarOpen(false); }}
      className={`flex items-center gap-3 w-full p-3 transition-colors ${
        screen === id ? 'bg-ink text-bg' : 'hover:bg-ink/5'
      }`}
    >
      <Icon size={18} />
      <span className="text-[11px] font-mono uppercase tracking-widest">{label}</span>
    </button>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 w-full h-14 bg-bg border-b border-line z-50 flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Shield className="text-accent" size={20} />
          <span className="font-serif italic font-bold">Aegis AI</span>
        </div>
        <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
          {isSidebarOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar */}
      <aside className={`
        fixed inset-0 z-40 lg:relative lg:inset-auto
        w-64 bg-bg border-r border-line flex flex-col
        transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 border-b border-line hidden lg:flex items-center gap-3">
          <Shield className="text-accent" size={24} />
          <div>
            <h1 className="font-serif italic text-xl leading-none">Aegis AI</h1>
            <p className="text-[9px] font-mono opacity-50 uppercase tracking-tighter">NVR Security Node</p>
          </div>
        </div>

        <nav className="flex-1 py-4">
          <NavItem id="dashboard" icon={LayoutGrid} label="Live Grid" />
          <NavItem id="config" icon={Camera} label="Camera Config" />
          <NavItem id="events" icon={History} label="Event Archive" />
          <NavItem id="settings" icon={Settings} label="System Config" />
        </nav>

        <div className="p-6 border-t border-line space-y-4">
          <div className="flex justify-between items-center text-[10px] font-mono opacity-50 uppercase">
            <span>Core Status</span>
            <span className={isModelLoaded ? 'text-emerald-600' : 'text-amber-600 animate-pulse'}>
              {isModelLoaded ? 'Operational' : 'Initializing'}
            </span>
          </div>
          <div className="h-1 bg-ink/10 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-accent"
              initial={{ width: 0 }}
              animate={{ width: isModelLoaded ? '100%' : '40%' }}
            />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden pt-14 lg:pt-0">
        <header className="h-14 border-b border-line flex items-center justify-between px-6 bg-white/30 backdrop-blur-sm">
          <div className="flex items-center gap-4">
            <span className="text-[10px] font-mono opacity-50 uppercase tracking-widest">Node: REDMI-N8P-01</span>
            <div className="h-4 w-[1px] bg-line/20" />
            <span className="text-[10px] font-mono opacity-50 uppercase tracking-widest">Uptime: 14d 02h 11m</span>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-[10px] font-mono uppercase">Network: Stable</span>
            </div>
            <button className="relative p-2 hover:bg-ink/5 rounded-full transition-colors">
              <Bell size={18} />
              {events.length > 0 && (
                <span className="absolute top-1 right-1 w-2 h-2 bg-accent rounded-full" />
              )}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto bg-bg/50">
          <AnimatePresence mode="wait">
            {screen === 'dashboard' && (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-6 space-y-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {cameras.filter(c => c.enabled).map(cam => (
                    <CameraFeed 
                      key={cam.id} 
                      config={cam} 
                      settings={settings}
                      onEvent={(type, conf, img) => handleNewEvent(cam.id, type, conf, img)}
                    />
                  ))}
                  
                  {/* Add Camera Slot */}
                  <div 
                    onClick={() => setScreen('config')}
                    className="aspect-video border-2 border-dashed border-line/10 rounded-lg flex flex-col items-center justify-center opacity-30 hover:opacity-100 transition-opacity cursor-pointer group"
                  >
                    <Camera size={32} className="group-hover:scale-110 transition-transform" />
                    <span className="mt-2 text-[10px] font-mono uppercase tracking-widest">Manage Camera Nodes</span>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Total Detections', value: events.length, icon: Shield },
                    { label: 'Active Streams', value: `${cameras.filter(c => c.enabled).length}/${cameras.length}`, icon: LayoutGrid },
                    { label: 'GPU Load', value: '42%', icon: Settings },
                    { label: 'Storage Used', value: '3.6GB', icon: History },
                  ].map((stat, i) => (
                    <div key={i} className="bg-white border border-line/10 p-4 rounded-lg flex justify-between items-center">
                      <div>
                        <p className="text-[10px] font-mono opacity-50 uppercase">{stat.label}</p>
                        <p className="text-xl font-serif italic">{stat.value}</p>
                      </div>
                      <stat.icon size={20} className="opacity-20" />
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {screen === 'events' && (
              <motion.div
                key="events"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full"
              >
                <EventHistory events={events} />
              </motion.div>
            )}

            {screen === 'settings' && (
              <motion.div
                key="settings"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <SettingsPanel settings={settings} onChange={setSettings} />
              </motion.div>
            )}

            {screen === 'config' && (
              <motion.div
                key="config"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <CameraConfigScreen cameras={cameras} onSave={handleSaveCameras} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
