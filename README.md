# Aegis AI Security NVR

This application is a web-based implementation of an AI-powered Home Security NVR, designed to fulfill the requirements of real-time object detection, motion analysis, and event management.

## Features
- **Real-time AI Detection**: Uses TensorFlow.js (COCO-SSD) for local browser-based inference (GPU accelerated).
- **Motion Detection**: OpenCV-inspired background subtraction logic implemented in TypeScript.
- **Multi-Camera Grid**: Supports simultaneous monitoring of multiple streams.
- **Event Logging**: Automatic capture of security events with metadata.
- **Detection Zones**: Interactive polygon zone configuration.
- **Responsive Design**: Optimized for mobile (Redmi Note 8 Pro) and desktop.

## Android Implementation Note
While this is a web-based dashboard, the core logic (Inference Engine, Motion Detection, Event Manager) is designed to be portable. For a native Android implementation, the logic would be ported to Kotlin using the TFLite GPU Delegate as specified in the user request.
