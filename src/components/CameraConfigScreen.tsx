import React, { useState, useEffect } from 'react';
import { CameraConfig } from '../types';
import { Camera, Save, RefreshCcw, Power, Link as LinkIcon, Activity, CheckCircle2, XCircle, Search, Plus } from 'lucide-react';

interface CameraConfigScreenProps {
  cameras: CameraConfig[];
  onSave: (cameras: CameraConfig[]) => void;
}

export const CameraConfigScreen: React.FC<CameraConfigScreenProps> = ({ cameras: initialCameras, onSave }) => {
  const [cameras, setCameras] = useState<CameraConfig[]>(initialCameras);
  const [isSaving, setIsSaving] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [discoveryRange, setDiscoveryRange] = useState({ start: 1, end: 50 });
  const [discoveredCameras, setDiscoveredCameras] = useState<{ ip: string, port: number, protocol?: string }[]>([]);
  const [testResults, setTestResults] = useState<Record<string, { loading: boolean, success?: boolean, message?: string }>>({});

  useEffect(() => {
    setCameras(initialCameras);
  }, [initialCameras]);

  const handleUpdate = (id: string, updates: Partial<CameraConfig>) => {
    setCameras(prev => prev.map(cam => cam.id === id ? { ...cam, ...updates } : cam));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(cameras);
    } finally {
      setIsSaving(false);
    }
  };

  const testConnection = async (id: string, ip: string, port: string) => {
    if (!ip || !port) return;
    
    setTestResults(prev => ({ ...prev, [id]: { loading: true } }));
    
    try {
      const res = await fetch('/api/cameras/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ip, port })
      });
      const data = await res.json();
      setTestResults(prev => ({ 
        ...prev, 
        [id]: { loading: false, success: data.success, message: data.message } 
      }));
    } catch (err) {
      setTestResults(prev => ({ 
        ...prev, 
        [id]: { loading: false, success: false, message: 'Network error' } 
      }));
    }
  };

  const discoverCameras = async () => {
    setIsDiscovering(true);
    try {
      const res = await fetch(`/api/cameras/discover?start=${discoveryRange.start}&end=${discoveryRange.end}`);
      const data = await res.json();
      if (data.success) {
        setDiscoveredCameras(data.foundCameras);
      }
    } catch (err) {
      console.error('Discovery failed:', err);
    } finally {
      setIsDiscovering(false);
    }
  };

  const addDiscoveredCamera = (ip: string, port: number) => {
    const newId = `cam-${Date.now()}`;
    const newCamera: CameraConfig = {
      id: newId,
      name: `New Camera ${ip}`,
      ip,
      port: port.toString(),
      username: '',
      password: '',
      channel: 1,
      streamType: 0,
      enabled: true,
      zones: []
    };
    setCameras(prev => [...prev, newCamera]);
    setDiscoveredCameras(prev => prev.filter(c => c.ip !== ip));
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <header className="space-y-1">
        <h2 className="font-serif italic text-2xl">Camera Nodes</h2>
        <p className="text-xs font-mono opacity-50 uppercase tracking-widest">RTSP Stream Configuration & Management</p>
        <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded text-[10px] text-amber-800 font-mono uppercase">
          Note: Local IP addresses (e.g. 192.168.x.x) will only work if the server is on the same network.
        </div>
        
        <div className="mt-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <h3 className="text-xs font-bold uppercase tracking-tight">Auto Discovery</h3>
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-bg/50 border border-line/10 rounded px-2 py-1">
                <span className="text-[9px] font-mono opacity-40 uppercase mr-2">Range:</span>
                <input 
                  type="number" 
                  value={discoveryRange.start} 
                  onChange={e => setDiscoveryRange(prev => ({ ...prev, start: parseInt(e.target.value) || 1 }))}
                  className="w-10 bg-transparent text-[10px] font-mono focus:outline-none"
                />
                <span className="mx-1 opacity-20">-</span>
                <input 
                  type="number" 
                  value={discoveryRange.end} 
                  onChange={e => setDiscoveryRange(prev => ({ ...prev, end: parseInt(e.target.value) || 1 }))}
                  className="w-10 bg-transparent text-[10px] font-mono focus:outline-none"
                />
              </div>
              <button
                onClick={discoverCameras}
                disabled={isDiscovering}
                className="flex items-center gap-2 bg-ink text-bg px-4 py-2 rounded font-mono text-[10px] uppercase tracking-widest hover:bg-accent transition-colors disabled:opacity-50"
              >
                {isDiscovering ? (
                  <Activity size={14} className="animate-spin" />
                ) : (
                  <Search size={14} />
                )}
                {isDiscovering ? 'Scanning...' : 'Scan Network'}
              </button>
            </div>
          </div>
          
          {discoveredCameras.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {discoveredCameras.map((cam, i) => (
                <div key={i} className="bg-white border border-line/10 p-3 rounded flex items-center justify-between shadow-sm">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="text-[10px] font-mono font-bold">{cam.ip}</p>
                      {cam.protocol && (
                        <span className="px-1 py-0.5 bg-accent/10 text-accent text-[8px] font-mono rounded uppercase">
                          {cam.protocol}
                        </span>
                      )}
                    </div>
                    <p className="text-[9px] font-mono opacity-50 uppercase">Port: {cam.port}</p>
                  </div>
                  <button
                    onClick={() => addDiscoveredCamera(cam.ip, cam.port)}
                    className="p-1.5 bg-ink/5 hover:bg-ink/10 rounded text-ink transition-colors"
                    title="Add Camera"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
          
          {isDiscovering && (
            <p className="text-[9px] font-mono opacity-50 uppercase animate-pulse">
              Scanning via UPnP, mDNS, and TCP port range {discoveryRange.start}-{discoveryRange.end}...
            </p>
          )}
        </div>
      </header>

      <div className="grid grid-cols-1 gap-6">
        {cameras.map((camera, index) => (
          <div key={camera.id} className="bg-white border border-line/10 rounded-lg overflow-hidden shadow-sm">
            <div className="p-4 border-b border-line/10 bg-bg/30 flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-ink text-bg rounded">
                  <Camera size={16} />
                </div>
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-tight">Camera {index + 1}</h3>
                  <p className="text-[9px] font-mono opacity-50">{camera.id}</p>
                </div>
              </div>
              <button
                onClick={() => handleUpdate(camera.id, { enabled: !camera.enabled })}
                className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-mono uppercase transition-colors ${
                  camera.enabled 
                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-200' 
                    : 'bg-red-100 text-red-700 border border-red-200'
                }`}
              >
                <Power size={12} />
                {camera.enabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase opacity-50">Friendly Name</label>
                <input
                  type="text"
                  value={camera.name}
                  onChange={(e) => handleUpdate(camera.id, { name: e.target.value })}
                  placeholder="e.g. Front Door"
                  className="w-full bg-bg/50 border border-line/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase opacity-50">IP Address</label>
                <input
                  type="text"
                  value={camera.ip}
                  onChange={(e) => handleUpdate(camera.id, { ip: e.target.value })}
                  placeholder="192.168.1.100"
                  className="w-full bg-bg/50 border border-line/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-accent transition-colors font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase opacity-50">Port</label>
                <input
                  type="text"
                  value={camera.port}
                  onChange={(e) => handleUpdate(camera.id, { port: e.target.value })}
                  placeholder="554"
                  className="w-full bg-bg/50 border border-line/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-accent transition-colors font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase opacity-50">Username</label>
                <input
                  type="text"
                  value={camera.username}
                  onChange={(e) => handleUpdate(camera.id, { username: e.target.value })}
                  placeholder="admin"
                  className="w-full bg-bg/50 border border-line/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase opacity-50">Password</label>
                <input
                  type="password"
                  value={camera.password}
                  onChange={(e) => handleUpdate(camera.id, { password: e.target.value })}
                  placeholder="••••••••"
                  className="w-full bg-bg/50 border border-line/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-accent transition-colors"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase opacity-50">Channel Number</label>
                <input
                  type="number"
                  min="1"
                  value={camera.channel}
                  onChange={(e) => handleUpdate(camera.id, { channel: parseInt(e.target.value) || 1 })}
                  placeholder="1"
                  className="w-full bg-bg/50 border border-line/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-accent transition-colors font-mono"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase opacity-50">Stream Type</label>
                <select
                  value={camera.streamType}
                  onChange={(e) => handleUpdate(camera.id, { streamType: parseInt(e.target.value) as 0 | 1 })}
                  className="w-full bg-bg/50 border border-line/10 rounded px-3 py-2 text-sm focus:outline-none focus:border-accent transition-colors font-mono"
                >
                  <option value={0}>0 (Main Stream)</option>
                  <option value={1}>1 (Sub Stream)</option>
                </select>
              </div>
            </div>

            <div className="px-6 pb-6 space-y-4">
              <div className="p-3 bg-bg/50 border border-line/5 rounded flex items-center gap-3">
                <LinkIcon size={14} className="opacity-30" />
                <div className="flex-1 overflow-hidden">
                  <p className="text-[9px] font-mono uppercase opacity-40 mb-1">Generated RTSP URL</p>
                  <p className="text-[10px] font-mono truncate">
                    rtsp://{camera.username && camera.password ? `${camera.username}:${camera.password}@` : ''}{camera.ip || '0.0.0.0'}:{camera.port || '554'}/unicast/c{camera.channel || 1}/s{camera.streamType ?? 0}/live
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  onClick={() => testConnection(camera.id, camera.ip, camera.port)}
                  disabled={testResults[camera.id]?.loading || !camera.ip}
                  className="flex items-center gap-2 px-4 py-2 bg-ink/5 hover:bg-ink/10 rounded text-[10px] font-mono uppercase tracking-widest transition-colors disabled:opacity-50"
                >
                  {testResults[camera.id]?.loading ? (
                    <Activity size={14} className="animate-spin" />
                  ) : (
                    <Activity size={14} />
                  )}
                  Test Connection
                </button>

                {testResults[camera.id] && !testResults[camera.id].loading && (
                  <div className={`flex items-center gap-2 text-[10px] font-mono uppercase ${
                    testResults[camera.id].success ? 'text-emerald-600' : 'text-red-600'
                  }`}>
                    {testResults[camera.id].success ? (
                      <CheckCircle2 size={14} />
                    ) : (
                      <XCircle size={14} />
                    )}
                    {testResults[camera.id].message}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <footer className="pt-8 border-t border-line/10 flex justify-end items-center gap-4">
        <button 
          onClick={() => setCameras(initialCameras)}
          className="flex items-center gap-2 px-6 py-2 rounded font-mono text-[10px] uppercase tracking-widest hover:bg-ink/5 transition-colors"
        >
          <RefreshCcw size={14} />
          Discard Changes
        </button>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 bg-ink text-bg px-8 py-2 rounded font-mono text-[10px] uppercase tracking-widest hover:bg-accent transition-colors disabled:opacity-50"
        >
          <Save size={14} />
          {isSaving ? 'Saving...' : 'Apply Configuration'}
        </button>
      </footer>
    </div>
  );
};
