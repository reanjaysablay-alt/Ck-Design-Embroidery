'use client';

import { useEffect, useRef, useState } from 'react';

/*
 * Camera QR scanner in a modal.
 *
 * Uses the browser's built-in BarcodeDetector when it exists (Chrome /
 * Android) and falls back to the "jsqr" package everywhere else
 * (iPhone Safari, desktop):
 *
 *   npm install jsqr
 *
 * The camera needs HTTPS (or localhost). If it can't open, staff can type
 * the code instead.
 *
 * Props:
 *   onResult(text)  called once with the decoded text
 *   onClose()       called when the modal is dismissed
 *   title           heading text
 *   hint            small help text under the camera
 *   placeholder     placeholder for the manual input
 */
export default function QrScannerModal({
  onResult,
  onClose,
  title = 'Scan QR code',
  hint = 'Hold the QR code steady inside the square.',
  placeholder = 'Or type the code',
}) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const onResultRef = useRef(onResult);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);
  const [manual, setManual] = useState('');

  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  useEffect(() => {
    let stopped = false;
    let stream = null;
    let timer = null;

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError(
          'The camera is not available here (it needs HTTPS). Type the code below instead.'
        );
        return;
      }

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' } },
          audio: false,
        });

        if (stopped) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }

        const video = videoRef.current;
        video.srcObject = stream;
        await video.play();
        setReady(true);

        const detector =
          'BarcodeDetector' in window
            ? new window.BarcodeDetector({ formats: ['qr_code'] })
            : null;

        let jsQR = null;
        if (!detector) jsQR = (await import('jsqr')).default;

        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });

        const tick = async () => {
          if (stopped) return;

          try {
            if (video.readyState >= 2 && video.videoWidth) {
              let value = '';

              if (detector) {
                const codes = await detector.detect(video);
                value = codes[0]?.rawValue || '';
              } else {
                const scale = Math.min(1, 640 / video.videoWidth);
                const w = Math.round(video.videoWidth * scale);
                const h = Math.round(video.videoHeight * scale);

                canvas.width = w;
                canvas.height = h;
                ctx.drawImage(video, 0, 0, w, h);

                const image = ctx.getImageData(0, 0, w, h);
                const result = jsQR(image.data, w, h, {
                  inversionAttempts: 'dontInvert',
                });
                value = result?.data || '';
              }

              if (value) {
                stopped = true;
                onResultRef.current?.(value);
                return;
              }
            }
          } catch {
            // Ignore a bad frame and keep scanning.
          }

          timer = setTimeout(tick, 200);
        };

        tick();
      } catch (err) {
        setError(
          err?.name === 'NotAllowedError'
            ? 'Camera permission was denied. Allow camera access in your browser, or type the code below.'
            : 'Could not start the camera. Type the code below instead.'
        );
      }
    }

    start();

    return () => {
      stopped = true;
      clearTimeout(timer);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  function submitManual(event) {
    event.preventDefault();
    const value = manual.trim();
    if (value) onResultRef.current?.(value);
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-end justify-center bg-slate-950/70 sm:items-center sm:p-4">
      <div className="flex max-h-full w-full max-w-md flex-col overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl dark:bg-slate-800 sm:rounded-3xl">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-slate-950 dark:text-slate-100">
            {title}
          </h3>

          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 dark:hover:bg-slate-600"
          >
            Close
          </button>
        </div>

        <div className="relative mt-4 aspect-square w-full overflow-hidden rounded-2xl bg-black">
          <video
            ref={videoRef}
            playsInline
            muted
            className="h-full w-full object-cover"
          />

          {ready && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="h-3/5 w-3/5 rounded-2xl border-4 border-white/80" />
            </div>
          )}

          {!ready && !error && (
            <div className="absolute inset-0 flex items-center justify-center text-sm text-white/80">
              Starting camera…
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />

        <p className="mt-3 text-center text-sm text-slate-500 dark:text-slate-400">
          {hint}
        </p>

        {error && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={submitManual} className="mt-4 flex gap-2">
          <input
            value={manual}
            onChange={(event) => setManual(event.target.value)}
            placeholder={placeholder}
            className="h-11 min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 text-base text-slate-800 outline-none focus:border-slate-400 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100 sm:text-sm"
          />

          <button
            type="submit"
            className="h-11 shrink-0 rounded-xl bg-slate-950 px-4 text-sm font-semibold text-white hover:bg-slate-800 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white"
          >
            Look up
          </button>
        </form>
      </div>
    </div>
  );
}