import React from 'react';
import { DetectionSettings } from '../types';
import { Sliders, Bell, Cpu, HardDrive } from 'lucide-react';

interface SettingsPanelProps {
  settings: DetectionSettings;
  onChange: (settings: DetectionSettings) => void;
}

export const SettingsPanel: React.FC<SettingsPanelProps> = ({ settings, onChange }) => {
  const handleChange = (key: keyof DetectionSettings, value: any) => {
    onChange({ ...settings, [key]: value });
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-8">
      <header className="space-y-1">
        <h2 className="font-serif italic text-2xl">System Parameters</h2>
        <p className="text-xs font-mono opacity-50 uppercase tracking-widest">Global Configuration Engine</p>
      </header>

      <section className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* AI Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-line/20 pb-2">
              <Cpu size={16} />
              <h3 className="text-xs font-bold uppercase tracking-tighter">Inference Engine</h3>
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono uppercase">
                  <span>Confidence Threshold</span>
                  <span>{(settings.confidenceThreshold * 100).toFixed(0)}%</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="0.9"
                  step="0.05"
                  value={settings.confidenceThreshold}
                  onChange={(e) => handleChange('confidenceThreshold', parseFloat(e.target.value))}
                  className="w-full accent-accent"
                />
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono uppercase">
                  <span>Sampling Rate</span>
                  <span>{settings.frameRate} FPS</span>
                </div>
                <input
                  type="range"
                  min="1"
                  max="15"
                  step="1"
                  value={settings.frameRate}
                  onChange={(e) => handleChange('frameRate', parseInt(e.target.value))}
                  className="w-full accent-accent"
                />
              </div>
            </div>
          </div>

          {/* Motion Settings */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 border-b border-line/20 pb-2">
              <Sliders size={16} />
              <h3 className="text-xs font-bold uppercase tracking-tighter">Motion Analysis</h3>
            </div>
            
            <div className="space-y-4">
              <label className="flex items-center justify-between cursor-pointer group">
                <span className="text-[10px] font-mono uppercase">Enable Pre-Inference Motion Detection</span>
                <div className="relative inline-flex items-center">
                  <input
                    type="checkbox"
                    checked={settings.enableMotionDetection}
                    onChange={(e) => handleChange('enableMotionDetection', e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-ink/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-accent"></div>
                </div>
              </label>

              <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-mono uppercase">
                  <span>Sensitivity</span>
                  <span>{settings.motionSensitivity}</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="100"
                  step="5"
                  value={settings.motionSensitivity}
                  onChange={(e) => handleChange('motionSensitivity', parseInt(e.target.value))}
                  className="w-full accent-accent"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Alert Settings */}
        <div className="space-y-4 pt-4">
          <div className="flex items-center gap-2 border-b border-line/20 pb-2">
            <Bell size={16} />
            <h3 className="text-xs font-bold uppercase tracking-tighter">Notification Protocol</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <div className="flex justify-between text-[10px] font-mono uppercase">
                <span>Alert Cooldown</span>
                <span>{settings.alertCooldown}s</span>
              </div>
              <input
                type="range"
                min="5"
                max="300"
                step="5"
                value={settings.alertCooldown}
                onChange={(e) => handleChange('alertCooldown', parseInt(e.target.value))}
                className="w-full accent-accent"
              />
            </div>
          </div>
        </div>
      </section>

      <footer className="pt-8 border-t border-line/10 flex justify-between items-center">
        <div className="flex items-center gap-2 opacity-40">
          <HardDrive size={14} />
          <span className="text-[9px] font-mono uppercase tracking-widest">Storage: 2.4GB Available / 6GB Total</span>
        </div>
        <button className="bg-ink text-bg px-6 py-2 rounded font-mono text-[10px] uppercase tracking-widest hover:bg-accent transition-colors">
          Save Configuration
        </button>
      </footer>
    </div>
  );
};
