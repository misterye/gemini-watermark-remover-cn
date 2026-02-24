import { WatermarkEngine } from './core/watermarkEngine.js';

let engine = null;

self.onmessage = async (e) => {
    const { type, payload } = e.data;

    try {
        if (type === 'init') {
            if (!engine) {
                engine = await WatermarkEngine.create();
            }
            self.postMessage({ type: 'init', success: true });
        } else if (type === 'process') {
            const { id, imageBitmap } = payload;
            if (!engine) throw new Error('Engine not initialized');

            const canvas = await engine.removeWatermarkFromImage(imageBitmap);

            // Convert OffscreenCanvas to Blob
            const blob = await canvas.convertToBlob({ type: 'image/png' });

            // Clean up resources
            // ImageBitmap must be closed to avoid memory leaks
            if (imageBitmap && typeof imageBitmap.close === 'function') {
                imageBitmap.close();
            }

            self.postMessage({
                type: 'process',
                payload: { id, blob, originalSize: { width: canvas.width, height: canvas.height } }
            });
        } else if (type === 'getInfo') {
            const { id, width, height } = payload;
            if (!engine) throw new Error('Engine not initialized');

            const info = engine.getWatermarkInfo(width, height);
            self.postMessage({ type: 'getInfo', payload: { id, info } });
        }
    } catch (error) {
        console.error('Worker error:', error);
        self.postMessage({
            type: 'error',
            payload: {
                id: payload?.id,
                message: error.message
            }
        });
    }
};
