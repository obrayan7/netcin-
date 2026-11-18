"use client";

import { useState, type ChangeEvent } from "react";

type Props = {
  name: string;
  label: string;
  accept: string;
  folder: "posters" | "backdrops" | "thumbs" | "videos";
  defaultValue?: string;
};

/** Champ : upload direct vers le bucket S3 (barre de progression) OU collage d'une URL. */
export default function UploadField({ name, label, accept, folder, defaultValue = "" }: Props) {
  const [value, setValue] = useState(defaultValue);
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState("");

  async function onFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");
    setProgress(0);
    try {
      const r = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ folder, filename: file.name, contentType: file.type }),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error ?? "Autorisation refusée");
      const { uploadUrl, publicUrl } = await r.json();

      await new Promise<void>((resolve, reject) => {
        const x = new XMLHttpRequest();
        x.open("PUT", uploadUrl);
        x.setRequestHeader("Content-Type", file.type);
        x.upload.onprogress = (ev) => ev.lengthComputable && setProgress(Math.round((ev.loaded / ev.total) * 100));
        x.onload = () => (x.status < 300 ? resolve() : reject(new Error(`Échec de l'envoi (${x.status})`)));
        x.onerror = () => reject(new Error("Erreur réseau (CORS du bucket ?)"));
        x.send(file);
      });
      setValue(publicUrl);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setProgress(null);
    }
  }

  return (
    <div className="field">
      <label>{label}</label>
      <input type="text" name={name} value={value} onChange={(e) => setValue(e.target.value)} placeholder="URL (ou envoyez un fichier ci-dessous)" />
      <input type="file" accept={accept} onChange={onFile} disabled={progress !== null} />
      {progress !== null && (
        <div className="progress"><div style={{ width: `${progress}%` }} /></div>
      )}
      {error && <p className="error">{error}</p>}
      {value && accept.startsWith("image") && <img src={value} alt="" className="preview" />}
    </div>
  );
}
