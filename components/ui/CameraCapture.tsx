'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Camera,
  Upload,
  X,
  Check,
  RotateCcw,
  Zap,
  Sun,
  Crop,
  ImagePlus,
} from 'lucide-react';

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface CameraCaptureProps {
  onCapture: (files: File[]) => void;
  maxFiles?: number;
  accept?: string;
}

type CaptureStage = 'idle' | 'camera' | 'preview';

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export function CameraCapture({
  onCapture,
  maxFiles = 5,
  accept = 'image/*',
}: CameraCaptureProps) {
  /* ---- state ---- */
  const [stage, setStage] = useState<CaptureStage>('idle');
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [cameraSupported, setCameraSupported] = useState(true);
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [enhanced, setEnhanced] = useState(false);
  const [cropVisible, setCropVisible] = useState(true);
  const [isDragging, setIsDragging] = useState(false);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  /* ---- refs ---- */
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  /* ------------------------------------------------------------------ */
  /*  Camera helpers                                                     */
  /* ------------------------------------------------------------------ */

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const startCamera = useCallback(async () => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setCameraSupported(false);
      return;
    }

    try {
      setPermissionDenied(false);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setStage('camera');
    } catch (err: any) {
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setPermissionDenied(true);
      } else {
        setCameraSupported(false);
      }
    }
  }, []);

  const captureFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const timestamp = Date.now();
        const file = new File([blob], `receipt_${timestamp}.jpg`, {
          type: 'image/jpeg',
          lastModified: timestamp,
        });
        setCapturedFile(file);
        setCapturedUrl(URL.createObjectURL(file));
        setEnhanced(false);
        setCropVisible(true);
        setStage('preview');
        stopStream();
      },
      'image/jpeg',
      0.92,
    );
  }, [stopStream]);

  /* ---- cleanup on unmount ---- */
  useEffect(() => {
    return () => {
      stopStream();
      if (capturedUrl) URL.revokeObjectURL(capturedUrl);
      previewUrls.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ------------------------------------------------------------------ */
  /*  File handling (fallback input / drag-drop / picker)                */
  /* ------------------------------------------------------------------ */

  const addFiles = useCallback(
    (files: FileList | File[]) => {
      const arr = Array.from(files).filter((f) =>
        accept.split(',').some((a) => f.type.match(a.trim().replace('*', '.*'))),
      );
      const slice = arr.slice(0, maxFiles - pendingFiles.length);
      if (slice.length === 0) return;

      const urls = slice.map((f) => URL.createObjectURL(f));
      setPendingFiles((prev) => [...prev, ...slice]);
      setPreviewUrls((prev) => [...prev, ...urls]);
    },
    [accept, maxFiles, pendingFiles.length],
  );

  const removePendingFile = useCallback(
    (index: number) => {
      URL.revokeObjectURL(previewUrls[index]);
      setPendingFiles((prev) => prev.filter((_, i) => i !== index));
      setPreviewUrls((prev) => prev.filter((_, i) => i !== index));
    },
    [previewUrls],
  );

  const confirmPendingFiles = useCallback(() => {
    if (pendingFiles.length > 0) {
      onCapture(pendingFiles);
      setPendingFiles([]);
      previewUrls.forEach((u) => URL.revokeObjectURL(u));
      setPreviewUrls([]);
    }
  }, [pendingFiles, onCapture, previewUrls]);

  /* ---- drag-drop ---- */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles],
  );

  /* ---- accept captured frame ---- */
  const useCaptured = useCallback(async () => {
    if (!capturedFile) return;

    const finalFile = enhanced
      ? await applyEnhancement(capturedFile)
      : capturedFile;

    onCapture([finalFile]);
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedFile(null);
    setCapturedUrl(null);
    setStage('idle');
  }, [capturedFile, capturedUrl, enhanced, onCapture]);

  const retake = useCallback(() => {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl);
    setCapturedFile(null);
    setCapturedUrl(null);
    startCamera();
  }, [capturedUrl, startCamera]);

  /* ------------------------------------------------------------------ */
  /*  Simple brightness/contrast enhancement via canvas                  */
  /* ------------------------------------------------------------------ */

  const applyEnhancement = async (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(file); return; }
        ctx.filter = 'contrast(1.25) brightness(1.1)';
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(new File([blob], file.name, { type: file.type }));
          } else {
            resolve(file);
          }
        }, file.type);
      };
      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  };

  /* ------------------------------------------------------------------ */
  /*  Render                                                             */
  /* ------------------------------------------------------------------ */

  return (
    <div className="relative w-full">
      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Hidden file input fallback */}
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        capture="environment"
        multiple
        className="hidden"
        onChange={(e) => {
          if (e.target.files) addFiles(e.target.files);
          e.target.value = '';
        }}
      />

      <AnimatePresence mode="wait">
        {/* ============================================================ */}
        {/*  IDLE — Drop zone + buttons                                  */}
        {/* ============================================================ */}
        {stage === 'idle' && (
          <motion.div
            key="idle"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* Drop zone */}
            <div
              ref={dropRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                'relative flex flex-col items-center justify-center gap-4 rounded-2xl border-2 border-dashed p-8 transition-all duration-200',
                'min-h-[220px] cursor-pointer bg-gray-50 dark:bg-gray-900',
                isDragging
                  ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 scale-[1.01]'
                  : 'border-gray-300 dark:border-gray-700 hover:border-emerald-400 dark:hover:border-emerald-600',
              )}
              onClick={() => fileInputRef.current?.click()}
            >
              {/* Animated border on drag */}
              {isDragging && (
                <motion.div
                  layoutId="drag-highlight"
                  className="pointer-events-none absolute inset-0 rounded-2xl border-2 border-emerald-500"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                />
              )}

              <motion.div
                animate={isDragging ? { scale: 1.1 } : { scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              >
                <ImagePlus className="h-10 w-10 text-gray-400 dark:text-gray-500" />
              </motion.div>

              <div className="text-center">
                <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Glissez vos photos ici ou{' '}
                  <span className="text-emerald-600 dark:text-emerald-400 underline underline-offset-2">
                    parcourez
                  </span>
                </p>
                <p className="mt-1 text-xs text-gray-400 dark:text-gray-600">
                  JPG, PNG — {maxFiles} fichier{maxFiles > 1 ? 's' : ''} max
                </p>
              </div>

              {/* Camera button */}
              {cameraSupported && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    startCamera();
                  }}
                  className="mt-2 inline-flex items-center gap-2 rounded-xl bg-black px-5 py-2.5 text-sm font-medium text-white shadow-lg transition-transform hover:scale-105 active:scale-95"
                >
                  <Camera className="h-4 w-4" />
                  Scanner un ticket
                </button>
              )}
            </div>

            {/* Pending file chips */}
            {previewUrls.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-4 space-y-3"
              >
                <div className="flex flex-wrap gap-3">
                  {previewUrls.map((url, i) => (
                    <div
                      key={url}
                      className="group relative h-20 w-20 overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700"
                    >
                      <img
                        src={url}
                        alt={`Aperçu ${i + 1}`}
                        className="h-full w-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removePendingFile(i)}
                        className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={confirmPendingFiles}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-md transition-transform hover:scale-105 active:scale-95"
                >
                  <Check className="h-4 w-4" />
                  Utiliser {pendingFiles.length} fichier{pendingFiles.length > 1 ? 's' : ''}
                </button>
              </motion.div>
            )}

            {/* Permission denied message */}
            {permissionDenied && (
              <div className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/30 dark:text-red-400">
                Acces camera refuse. Verifiez les permissions de votre navigateur ou utilisez le bouton de telechargement ci-dessus.
              </div>
            )}
          </motion.div>
        )}

        {/* ============================================================ */}
        {/*  CAMERA — Live viewfinder                                    */}
        {/* ============================================================ */}
        {stage === 'camera' && (
          <motion.div
            key="camera"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative flex flex-col items-center overflow-hidden rounded-2xl bg-black"
            style={{ minHeight: '60vh' }}
          >
            {/* Close button */}
            <button
              type="button"
              onClick={() => {
                stopStream();
                setStage('idle');
              }}
              className="absolute left-4 top-4 z-20 flex h-10 w-10 items-center justify-center rounded-full bg-black/50 text-white backdrop-blur-sm transition-transform hover:scale-110 active:scale-95"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Video feed */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full object-cover"
              style={{ minHeight: '60vh' }}
            />

            {/* Viewfinder overlay */}
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
              <div className="relative h-3/5 w-4/5 rounded-lg border-2 border-white/30">
                {/* Corner brackets */}
                <span className="absolute -left-1 -top-1 h-6 w-6 border-l-2 border-t-2 border-white rounded-tl-lg" />
                <span className="absolute -right-1 -top-1 h-6 w-6 border-r-2 border-t-2 border-white rounded-tr-lg" />
                <span className="absolute -bottom-1 -left-1 h-6 w-6 border-b-2 border-l-2 border-white rounded-bl-lg" />
                <span className="absolute -bottom-1 -right-1 h-6 w-6 border-b-2 border-r-2 border-white rounded-br-lg" />
              </div>
            </div>

            {/* Capture button */}
            <div className="absolute inset-x-0 bottom-0 flex justify-center pb-8 pt-6">
              <motion.button
                type="button"
                onClick={captureFrame}
                whileTap={{ scale: 0.9 }}
                className="relative flex h-[72px] w-[72px] items-center justify-center rounded-full border-4 border-white bg-white/20 backdrop-blur-sm transition-all hover:bg-white/30"
              >
                <span className="block h-[56px] w-[56px] rounded-full bg-white" />
              </motion.button>
            </div>

            {/* Gallery shortcut */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute right-4 bottom-8 flex h-12 w-12 items-center justify-center rounded-xl bg-black/40 text-white backdrop-blur-sm transition-transform hover:scale-110 active:scale-95"
            >
              <Upload className="h-5 w-5" />
            </button>
          </motion.div>
        )}

        {/* ============================================================ */}
        {/*  PREVIEW — Captured frame with editing tools                 */}
        {/* ============================================================ */}
        {stage === 'preview' && capturedUrl && (
          <motion.div
            key="preview"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="relative flex flex-col items-center overflow-hidden rounded-2xl bg-black"
            style={{ minHeight: '60vh' }}
          >
            {/* Image preview */}
            <div className="relative w-full flex-1">
              <img
                src={capturedUrl}
                alt="Capture"
                className={cn(
                  'w-full object-contain transition-[filter] duration-300',
                  enhanced && 'contrast-125 brightness-110',
                )}
                style={{ minHeight: '50vh' }}
              />

              {/* Auto-crop suggestion overlay */}
              {cropVisible && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
                  className="pointer-events-none absolute inset-[8%] rounded-lg border-[3px] border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                >
                  <span className="absolute -left-1 -top-1 h-5 w-5 border-l-2 border-t-2 border-emerald-400 rounded-tl-lg" />
                  <span className="absolute -right-1 -top-1 h-5 w-5 border-r-2 border-t-2 border-emerald-400 rounded-tr-lg" />
                  <span className="absolute -bottom-1 -left-1 h-5 w-5 border-b-2 border-l-2 border-emerald-400 rounded-bl-lg" />
                  <span className="absolute -bottom-1 -right-1 h-5 w-5 border-b-2 border-r-2 border-emerald-400 rounded-br-lg" />

                  <div className="absolute -top-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-emerald-500/90 px-3 py-1 text-xs font-medium text-white">
                    Zone detectee
                  </div>
                </motion.div>
              )}
            </div>

            {/* Toolbar */}
            <div className="w-full bg-black/80 px-4 pb-6 pt-4">
              {/* Toggle row */}
              <div className="mb-4 flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setEnhanced((v) => !v)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                    enhanced
                      ? 'bg-yellow-500/20 text-yellow-400 ring-1 ring-yellow-500/50'
                      : 'bg-white/10 text-white/70 hover:bg-white/20',
                  )}
                >
                  <Sun className="h-3.5 w-3.5" />
                  Luminosite
                </button>

                <button
                  type="button"
                  onClick={() => setCropVisible((v) => !v)}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors',
                    cropVisible
                      ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50'
                      : 'bg-white/10 text-white/70 hover:bg-white/20',
                  )}
                >
                  <Crop className="h-3.5 w-3.5" />
                  Recadrage
                </button>
              </div>

              {/* Action row */}
              <div className="flex items-center justify-center gap-4">
                <button
                  type="button"
                  onClick={retake}
                  className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-6 py-3 text-sm font-medium text-white backdrop-blur-sm transition-transform hover:scale-105 active:scale-95"
                >
                  <RotateCcw className="h-4 w-4" />
                  Reprendre
                </button>

                <button
                  type="button"
                  onClick={useCaptured}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-medium text-white shadow-lg shadow-emerald-600/30 transition-transform hover:scale-105 active:scale-95"
                >
                  <Check className="h-4 w-4" />
                  Utiliser
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
