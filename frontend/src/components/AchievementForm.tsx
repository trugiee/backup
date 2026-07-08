import { useState } from 'react';
import { uploadImage, createAchievement } from '../api';

interface AchievementFormProps {
  token: string;
  onClose: () => void;
  onCreated: () => void;
}

export default function AchievementForm({ token, onClose, onCreated }: AchievementFormProps) {
  const [form, setForm] = useState({
    title: '',
    description: '',
    year: new Date().getFullYear().toString(),
    proofLink: '',
  });
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) setProofFile(e.target.files[0]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title) {
      setError('Title is required');
      return;
    }

    setSaving(true);
    setError('');

    try {
      let proofImageUrl = '';
      if (proofFile) {
        const uploadData = await uploadImage(token, proofFile);
        proofImageUrl = uploadData.imageUrl;
      }

      await createAchievement(token, {
        title: form.title,
        description: form.description || undefined,
        year: form.year ? parseInt(form.year) : undefined,
        proofLink: form.proofLink || undefined,
        proofImageUrl: proofImageUrl || undefined,
      });

      onCreated();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add achievement');
    } finally {
      setSaving(false);
    }
  };

  const previewSrc = proofFile ? URL.createObjectURL(proofFile) : '';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 md:p-6 bg-zinc-900/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-zinc-900 rounded-none sm:rounded-3xl w-full h-full sm:h-auto max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[100vh] sm:max-h-[90vh]">
        {/* Header */}
        <div className="px-6 sm:px-8 py-5 flex items-center justify-between sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b sm:border-b-0 border-zinc-100 dark:border-zinc-800">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
              Add Achievement
            </h2>
            <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">Showcase your awards or recognitions</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-900 dark:text-zinc-100 flex items-center justify-center transition-colors font-bold"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 sm:px-8 pb-8 pt-4 sm:pt-0">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm font-medium rounded-xl border border-red-100">
              {error}
            </div>
          )}

          <form id="add-achievement-form" onSubmit={handleSubmit} className="space-y-8">
            <div className="space-y-6">
              <div>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  required
                  className="w-full bg-transparent border-b-2 border-zinc-200 dark:border-zinc-700 py-2 text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 placeholder-zinc-300 focus:outline-none focus:border-black transition-colors"
                  placeholder="Achievement Title (e.g. Best in Show)"
                />
              </div>

              <div>
                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 rounded-2xl p-4 text-sm text-zinc-700 dark:text-zinc-300 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:ring-zinc-700 transition-all resize-none"
                  placeholder="Describe the achievement, the organization that gave it to you, or any other context..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block mb-2">Year Received</label>
                  <input
                    name="year"
                    type="number"
                    value={form.year}
                    onChange={handleChange}
                    className="w-full bg-transparent border-b border-zinc-200 dark:border-zinc-700 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-black transition-colors"
                    placeholder="e.g. 2024"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block mb-2">Proof Link (Optional)</label>
                  <input
                    name="proofLink"
                    value={form.proofLink}
                    onChange={handleChange}
                    className="w-full bg-transparent border-b border-zinc-200 dark:border-zinc-700 py-2 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-black transition-colors"
                    placeholder="https://..."
                  />
                </div>
              </div>
            </div>

            {/* Proof Upload */}
            <div>
              <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-4">Proof of Achievement (Image/Certificate)</h3>
              <div className="group relative h-40 sm:h-52 bg-zinc-50 dark:bg-zinc-950 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-3xl overflow-hidden hover:border-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer flex flex-col items-center justify-center text-center p-6">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                {previewSrc ? (
                  <img src={previewSrc} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                ) : (
                  <div className="space-y-2 pointer-events-none">
                    <div className="w-12 h-12 rounded-full bg-white dark:bg-zinc-900 shadow-sm dark:shadow-zinc-900/30 flex items-center justify-center mx-auto">
                      <svg className="w-6 h-6 text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                      </svg>
                    </div>
                    <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Upload Certificate/Photo</p>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400">Drag & drop or click to browse</p>
                  </div>
                )}
                {previewSrc && (
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-0">
                    <p className="text-white font-semibold text-sm">Change Image</p>
                  </div>
                )}
              </div>
            </div>

            {/* Save button */}
            <div className="pt-4 flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-4 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm font-bold hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                form="add-achievement-form"
                disabled={saving}
                className="flex-1 py-4 rounded-2xl bg-black text-white text-sm font-bold hover:bg-zinc-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/10"
              >
                {saving ? (
                  <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Submitting...</>
                ) : (
                  'Submit for Verification'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
