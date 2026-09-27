import * as faceapi from '@vladmandic/face-api';

let modelsLoaded = false;
let modelLoadingPromise: Promise<void> | null = null;

export const FACE_MATCH_THRESHOLD = 0.5;

/**
 * Loads SSD MobileNet V1, Face Landmarks 68, and Face Recognition models from /models
 */
export async function loadFaceApiModels(): Promise<void> {
  if (modelsLoaded) return;
  if (modelLoadingPromise) return modelLoadingPromise;

  modelLoadingPromise = (async () => {
    try {
      const MODEL_URL = '/models';
      await Promise.all([
        faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
        faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
        faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
      ]);
      modelsLoaded = true;
      console.log('✅ face-api AI models loaded successfully');
    } catch (error) {
      console.error('❌ Failed to load face-api models:', error);
      modelLoadingPromise = null;
      throw error;
    }
  })();

  return modelLoadingPromise;
}

/**
 * Calculates Euclidean Distance between two 128-float face descriptors
 * Distance = sqrt( sum( (A_i - B_i)^2 ) )
 */
export function calculateEuclideanDistance(desc1: number[], desc2: number[]): number {
  if (!desc1 || !desc2 || desc1.length !== desc2.length) {
    return 1.0;
  }
  let sum = 0;
  for (let i = 0; i < desc1.length; i++) {
    const diff = desc1[i] - desc2[i];
    sum += diff * diff;
  }
  return Math.sqrt(sum);
}

/**
 * Detects single face with 68 landmarks & 128D descriptor from video or image element
 */
export async function detectSingleFaceDescriptor(
  input: HTMLVideoElement | HTMLImageElement | HTMLCanvasElement,
  minConfidence: number = 0.5,
) {
  await loadFaceApiModels();
  const options = new faceapi.SsdMobilenetv1Options({ minConfidence });
  const detection = await faceapi
    .detectSingleFace(input, options)
    .withFaceLandmarks()
    .withFaceDescriptor();

  if (!detection) return null;

  return {
    detection: detection.detection,
    landmarks: detection.landmarks,
    descriptor: Array.from(detection.descriptor), // convert Float32Array to number[]
    box: detection.detection.box,
  };
}

export { faceapi };
