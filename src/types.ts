export interface SecurityEvent {
  id: number;
  timestamp: string;
  camera_id: string;
  object_type: string;
  confidence: number;
  image_data: string;
}

export interface CameraConfig {
  id: string;
  name: string;
  ip: string;
  port: string;
  username?: string;
  password?: string;
  channel: number;
  streamType: 0 | 1;
  enabled: boolean;
  zones: Point[][];
}

export interface Point {
  x: number;
  y: number;
}

export interface DetectionSettings {
  confidenceThreshold: number;
  motionSensitivity: number;
  frameRate: number;
  enableMotionDetection: boolean;
  alertCooldown: number;
}

export type AppScreen = 'dashboard' | 'events' | 'settings' | 'config';
