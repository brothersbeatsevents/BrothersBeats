'use client';

import { useRef, useState } from 'react';
import { getPresignedUpload, uploadToPresignedUrl } from '@/lib/api';
import { HeroImage, MAX_HERO_IMAGES } from '@/lib/hero-images';

export default function HeroImagesEditor({ images, onChange, token, disabled, onUploadingChange }: {
  images: HeroImage[];
  onChange: (images: HeroImage[]) => void;
  token: string;
  disabled: boolean;
  onUploadingChange: (uploading: boolean) => void;
}) {
  const [selected, setSelected] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [dragging, setDragging] = useState(false);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const index = Math.min(selected, Math.max(0, images.length - 1));
  const image = images[index];
  const [positionX, positionY] = (image?.position || '50% 50%').split(' ').map(parseFloat);
  const zoom = image?.zoom || 1;

  function updateImage(changes: Partial<HeroImage>) {
    onChange(images.map((item, i) => i === index ? { ...item, ...changes } : item));
  }

  function updateCrop(x: number, y: number) {
    updateImage({ position: `${Math.max(0, Math.min(100, x))}% ${Math.max(0, Math.min(100, y))}%` });
  }

  function moveImage(direction: number) {
    const next = index + direction;
    if (next < 0 || next >= images.length) return;
    const reordered = [...images];
    [reordered[index], reordered[next]] = [reordered[next], reordered[index]];
    onChange(reordered);
    setSelected(next);
  }

  async function upload(event: React.ChangeEvent<HTMLInputElement>, replace = false) {
    const input = event.currentTarget;
    const files = Array.from(input.files || []);
    input.value = '';
    if (!files.length || uploading || disabled) return;
    setError('');
    if (!replace && images.length + files.length > MAX_HERO_IMAGES) {
      setError(`You can have up to ${MAX_HERO_IMAGES} hero images. Choose ${MAX_HERO_IMAGES - images.length} or fewer files.`);
      return;
    }
    if (files.some((file) => !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 5 * 1024 * 1024)) {
      setError('Choose JPG, PNG, or WebP images of 5 MB or less each.');
      return;
    }
    setUploading(true);
    onUploadingChange(true);
    const uploaded: HeroImage[] = [];
    try {
      for (const file of files) {
        const { data } = await getPresignedUpload(file.type, 'general', token);
        await uploadToPresignedUrl(data.uploadUrl, file);
        uploaded.push({ url: data.publicUrl, position: '50% 50%', zoom: 1 });
      }
    } catch (err) {
      setError(`${err instanceof Error ? err.message : 'Upload failed.'} ${uploaded.length ? 'Successfully uploaded images have been added. ' : ''}Please retry the remaining images.`);
    } finally {
      if (uploaded.length) {
        onChange(replace ? images.map((item, i) => i === index ? uploaded[0] : item) : [...images, ...uploaded]);
        setSelected(replace ? index : images.length);
      }
      setUploading(false);
      onUploadingChange(false);
    }
  }

  return (
    <fieldset disabled={disabled || uploading} className="min-w-0 space-y-3">
      <legend className="text-sm font-medium text-bb-text">Homepage hero images ({images.length}/{MAX_HERO_IMAGES})</legend>
      <p className="text-xs text-bb-text-muted">Upload 1–6 images. Multiple images rotate every 5 seconds until a visitor interacts or pauses.</p>
      {images.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2" role="group" aria-label="Select a hero image to edit">
          {images.map((item, i) => (
            <button key={`${item.url}-${i}`} type="button" onClick={() => setSelected(i)} aria-label={`Edit hero image ${i + 1}`} aria-pressed={i === index} className={`relative aspect-video overflow-hidden rounded-lg border-2 ${i === index ? 'border-bb-gold' : 'border-bb-border'}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.url} alt="" className="w-full h-full object-cover" style={{ objectPosition: item.position || '50% 50%', transform: `scale(${item.zoom || 1})` }} />
              <span className="absolute bottom-0 right-0 rounded-tl bg-black/70 px-1.5 text-xs text-white">{i + 1}</span>
            </button>
          ))}
        </div>
      )}
      {image && (
        <>
          <div
            className={`relative w-full aspect-video overflow-hidden rounded-xl border border-bb-border bg-bb-ink touch-none ${dragging ? 'cursor-grabbing' : 'cursor-grab'} ${disabled || uploading ? 'pointer-events-none' : ''}`}
            onPointerDown={(event) => {
              event.currentTarget.setPointerCapture(event.pointerId);
              lastPointer.current = { x: event.clientX, y: event.clientY };
              setDragging(true);
            }}
            onPointerMove={(event) => {
              if (!lastPointer.current) return;
              const rect = event.currentTarget.getBoundingClientRect();
              const deltaX = (event.clientX - lastPointer.current.x) / rect.width * 100 / zoom;
              const deltaY = (event.clientY - lastPointer.current.y) / rect.height * 100 / zoom;
              lastPointer.current = { x: event.clientX, y: event.clientY };
              updateCrop(positionX - deltaX, positionY - deltaY);
            }}
            onPointerUp={(event) => {
              event.currentTarget.releasePointerCapture(event.pointerId);
              lastPointer.current = null;
              setDragging(false);
            }}
            onLostPointerCapture={() => { lastPointer.current = null; setDragging(false); }}
            onPointerCancel={() => { lastPointer.current = null; setDragging(false); }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.url} alt={image.alt || ''} draggable={false} className="absolute inset-0 w-full h-full object-cover select-none" style={{ objectPosition: image.position || '50% 50%', transform: `scale(${zoom})` }} />
            <div className="absolute inset-0 pointer-events-none ring-2 ring-inset ring-white/70" />
          </div>
          <p className="text-xs text-bb-text-muted">Editing image {index + 1}. Drag to choose the crop, or use the sliders. The frame is locked to 16:9.</p>
          <div className="flex flex-wrap gap-3 text-xs font-semibold">
            <button type="button" disabled={index === 0} onClick={() => moveImage(-1)} className="text-bb-text-secondary disabled:opacity-40">Move earlier</button>
            <button type="button" disabled={index === images.length - 1} onClick={() => moveImage(1)} className="text-bb-text-secondary disabled:opacity-40">Move later</button>
            <button type="button" onClick={() => { onChange(images.filter((_, i) => i !== index)); setSelected(Math.max(0, index - 1)); }} className="text-red-700">Remove image</button>
          </div>
          <label className="block text-xs text-bb-text-secondary">Replace selected image
            <input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => upload(event, true)} className="block w-full text-sm mt-1" />
          </label>
          <label className="block text-xs text-bb-text-secondary">Image description
            <input value={image.alt || ''} maxLength={300} onChange={(event) => updateImage({ alt: event.target.value })} placeholder="Describe the image for screen readers" className="w-full rounded-lg border border-bb-border px-3 py-2 mt-1 text-sm" />
          </label>
          <label className="block text-xs text-bb-text-secondary">Zoom ({zoom.toFixed(2)}x)
            <input type="range" min="1" max="3" step="0.05" value={zoom} onChange={(event) => updateImage({ zoom: Number(event.target.value) })} className="block w-full mt-2" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs text-bb-text-secondary">Horizontal position
              <input type="range" min="0" max="100" value={positionX} onChange={(event) => updateCrop(Number(event.target.value), positionY)} className="block w-full mt-2" />
            </label>
            <label className="text-xs text-bb-text-secondary">Vertical position
              <input type="range" min="0" max="100" value={positionY} onChange={(event) => updateCrop(positionX, Number(event.target.value))} className="block w-full mt-2" />
            </label>
          </div>
          <button type="button" onClick={() => updateImage({ position: '50% 50%', zoom: 1 })} className="text-xs font-semibold text-bb-gold hover:text-bb-gold-dark">Reset crop</button>
        </>
      )}
      <label className="block text-sm font-medium text-bb-text">Add hero images
        <input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(event) => upload(event)} disabled={images.length >= MAX_HERO_IMAGES || disabled || uploading} className="block w-full text-sm mt-1 disabled:opacity-50" />
      </label>
      <p className="text-xs text-bb-text-muted">JPG, PNG, or WebP; maximum 5 MB each. Save settings to publish your changes.</p>
      {uploading && <p role="status" className="text-xs text-bb-text-secondary">Uploading images…</p>}
      {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    </fieldset>
  );
}
