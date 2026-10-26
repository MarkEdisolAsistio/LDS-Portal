"use client";

import Image from "next/image";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { updateProfilePicture } from "@/app/admin/profile-actions";

const SIZE = 256;

export default function ProfilePictureEditor({ name, roleName, imageUrl }: { name: string; roleName: string; imageUrl?: string }) {
  const [open, setOpen] = useState(false);
  const [source, setSource] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [saving, setSaving] = useState(false);
  const pickerId = useId();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const scale = Math.max(SIZE / image.naturalWidth, SIZE / image.naturalHeight) * zoom;
    const width = image.naturalWidth * scale;
    const height = image.naturalHeight * scale;
    const x = (SIZE - width) * ((offsetX + 100) / 200);
    const y = (SIZE - height) * ((offsetY + 100) / 200);
    context.clearRect(0, 0, SIZE, SIZE);
    context.fillStyle = "#e2e8f0";
    context.fillRect(0, 0, SIZE, SIZE);
    context.drawImage(image, x, y, width, height);
  }, [zoom, offsetX, offsetY]);

  useEffect(() => {
    if (!source) return;
    const image = new window.Image();
    image.onload = () => { imageRef.current = image; draw(); };
    image.src = source;
    return () => { imageRef.current = null; };
  }, [source, draw]);

  useEffect(() => { draw(); }, [draw]);

  function chooseFile(file: File | undefined) {
    if (!file || !file.type.startsWith("image/")) return;
    setSource(URL.createObjectURL(file));
    setZoom(1);
    setOffsetX(0);
    setOffsetY(0);
    setOpen(true);
  }

  async function save() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setSaving(true);
    canvas.toBlob(async (blob) => {
      if (!blob) { setSaving(false); return; }
      const formData = new FormData();
      formData.set("profile_picture", new File([blob], "profile-picture.jpg", { type: "image/jpeg" }));
      await updateProfilePicture(formData);
      window.location.reload();
    }, "image/jpeg", 0.9);
  }

  return <>
    <div className="mb-6 flex items-center gap-3">
      <button type="button" onClick={() => setOpen(true)} className="shrink-0" title="Change profile picture">
        {imageUrl ? <Image src={imageUrl} alt={`${name} profile`} width={48} height={48} className="h-12 w-12 rounded-full object-cover" unoptimized /> : <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0d5a89] text-lg font-semibold text-white">{name.charAt(0).toUpperCase()}</div>}
      </button>
      <div className="min-w-0"><p className="text-lg font-semibold">LDS Portal</p><p className="truncate text-sm text-slate-600">{name}</p><p className="truncate text-xs text-slate-400">{roleName}</p><label htmlFor={pickerId} className="mt-1 inline-block cursor-pointer text-xs text-blue-700 underline">Change picture</label></div>
    </div>
    <input type="file" accept="image/*" className="sr-only" id={pickerId} onChange={(event) => chooseFile(event.target.files?.[0])} />
    {open && <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-4" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="profile-picture-title" className="w-full max-w-md rounded-xl bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between"><h2 id="profile-picture-title" className="text-lg font-semibold">Adjust profile picture</h2><button type="button" onClick={() => setOpen(false)} className="text-xl text-slate-500" aria-label="Close">×</button></div>
        {!source && <label className="mt-5 block cursor-pointer rounded-lg border-2 border-dashed border-slate-300 p-8 text-center text-sm text-slate-600 hover:border-blue-400"><input type="file" accept="image/*" className="sr-only" onChange={(event) => chooseFile(event.target.files?.[0])} />Choose a picture</label>}
        {source && <><div className="mt-5 flex justify-center"><canvas ref={canvasRef} width={SIZE} height={SIZE} className="h-64 w-64 rounded-full border-4 border-slate-200 object-cover" /></div><div className="mt-4 space-y-3"><label className="block text-sm text-slate-700">Zoom<input type="range" min="1" max="3" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} className="w-full" /></label><label className="block text-sm text-slate-700">Horizontal alignment<input type="range" min="-100" max="100" value={offsetX} onChange={(event) => setOffsetX(Number(event.target.value))} className="w-full" /></label><label className="block text-sm text-slate-700">Vertical alignment<input type="range" min="-100" max="100" value={offsetY} onChange={(event) => setOffsetY(Number(event.target.value))} className="w-full" /></label></div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={() => setOpen(false)} className="rounded-lg border border-slate-300 px-4 py-2 text-sm text-slate-700">Cancel</button><button type="button" onClick={save} disabled={saving} className="rounded-lg bg-[#0d5a89] px-4 py-2 text-sm text-white disabled:opacity-50">{saving ? "Saving..." : "Save picture"}</button></div></>}
      </section>
    </div>}
  </>;
}
