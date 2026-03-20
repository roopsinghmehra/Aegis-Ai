import React from 'react';
import { SecurityEvent } from '../types';
import { format } from 'date-fns';
import { Shield, Clock, Camera, Tag } from 'lucide-react';

interface EventHistoryProps {
  events: SecurityEvent[];
}

export const EventHistory: React.FC<EventHistoryProps> = ({ events }) => {
  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-line flex justify-between items-center bg-white/50">
        <h2 className="font-serif italic text-lg">Security Archive</h2>
        <span className="text-[10px] font-mono opacity-50 uppercase">{events.length} Records</span>
      </div>
      
      <div className="flex-1 overflow-y-auto">
        {events.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 opacity-30">
            <Shield size={48} strokeWidth={1} />
            <p className="mt-4 font-serif italic">No security events logged</p>
          </div>
        ) : (
          <div className="divide-y divide-line/10">
            {events.map((event) => (
              <div key={event.id} className="data-row p-4 flex gap-4 items-center">
                <div className="w-20 h-12 bg-black rounded overflow-hidden flex-shrink-0 border border-line/10">
                  <img src={event.image_data} alt="Event" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                
                <div className="flex-1 grid grid-cols-3 gap-4">
                  <div className="flex flex-col">
                    <span className="col-header">Timestamp</span>
                    <span className="data-value text-xs">{format(new Date(event.timestamp), 'HH:mm:ss')}</span>
                    <span className="text-[9px] opacity-50">{format(new Date(event.timestamp), 'MMM dd, yyyy')}</span>
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="col-header">Source</span>
                    <span className="data-value text-xs uppercase">{event.camera_id}</span>
                  </div>
                  
                  <div className="flex flex-col">
                    <span className="col-header">Detection</span>
                    <span className="data-value text-xs uppercase text-accent font-bold">{event.object_type}</span>
                    <span className="text-[9px] opacity-50">{(event.confidence * 100).toFixed(1)}% Conf.</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
