import * as cocoSsd from '@tensorflow-models/coco-ssd';
import '@tensorflow/tfjs';

export class DetectionEngine {
  private model: cocoSsd.ObjectDetection | null = null;
  private isInitializing = false;

  async init() {
    if (this.model || this.isInitializing) return;
    this.isInitializing = true;
    try {
      // Use 'lite_mobilenet_v2' for performance on mobile devices like Redmi Note 8 Pro
      this.model = await cocoSsd.load({
        base: 'lite_mobilenet_v2'
      });
      console.log('AI Model loaded successfully');
    } catch (error) {
      console.error('Failed to load AI model:', error);
    } finally {
      this.isInitializing = false;
    }
  }

  async detect(video: HTMLVideoElement | HTMLCanvasElement): Promise<cocoSsd.DetectedObject[]> {
    if (!this.model) return [];
    return await this.model.detect(video);
  }

  // Simple motion detection using frame differencing
  detectMotion(currentFrame: ImageData, previousFrame: ImageData | null, threshold: number = 30): boolean {
    if (!previousFrame) return false;
    
    let changedPixels = 0;
    const data1 = currentFrame.data;
    const data2 = previousFrame.data;
    
    for (let i = 0; i < data1.length; i += 4) {
      const rDiff = Math.abs(data1[i] - data2[i]);
      const gDiff = Math.abs(data1[i+1] - data2[i+1]);
      const bDiff = Math.abs(data1[i+2] - data2[i+2]);
      
      if ((rDiff + gDiff + bDiff) / 3 > threshold) {
        changedPixels++;
      }
    }
    
    // If more than 0.5% of pixels changed, consider it motion
    return (changedPixels / (data1.length / 4)) > 0.005;
  }
}

export const detectionEngine = new DetectionEngine();
