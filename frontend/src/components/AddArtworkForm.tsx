import { useState, useEffect } from 'react';
import { uploadImage, createArtworkListingCheckout, confirmAndCreateArtwork, fetchExhibitors } from '../api';
import { XIcon } from './Icons';
import { useToast } from './Toast';
import type { ArtworkMedia } from '../types';

const ART_TYPES = ['painting', 'sculpture', 'photography', 'digital_art', 'mixed_media', 'installation', 'print', 'other'];

interface MediaItem {
  type: 'image' | 'video';
  file?: File;
  url?: string;
}

interface AddArtworkFormProps {
  token: string;
  onClose: () => void;
  onCreated: () => void;
}

export default function AddArtworkForm({ token, onClose, onCreated }: AddArtworkFormProps) {
  const [form, setForm] = useState<any>({
    title: '', type: 'painting', yearCreated: '', style: '', description: '', price: '', status: 'Available',
    medium: '', canvasType: '', material: '', height: '', width: '', depth: '', weight: '',
  });
  const [primaryFile, setPrimaryFile] = useState<File | null>(null);
  const [primaryUrl, setPrimaryUrl] = useState('');
  const [additionalMedia, setAdditionalMedia] = useState<MediaItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  // Contributors
  const [exhibitors, setExhibitors] = useState<{ id: string; name: string; profilePicture?: string | null }[]>([]);
  const [selectedContributors, setSelectedContributors] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchExhibitors(token).then(setExhibitors).catch(e => console.error('Failed to load exhibitors', e));
  }, []);

  const toggleContributor = (id: string) => {
    setSelectedContributors(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const filteredExhibitors = exhibitors.filter(e =>
    e.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const addMedia = (type: 'image' | 'video') => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = type === 'image' ? 'image/*' : 'video/*';
    input.multiple = false;
    input.onchange = () => {
      const file = input.files?.[0];
      if (file) setAdditionalMedia(prev => [...prev, { type, file }]);
    };
    input.click();
  };

  const removeMedia = (index: number) => {
    setAdditionalMedia(prev => prev.filter((_, i) => i !== index));
  };

  const updateMediaUrl = (index: number, url: string) => {
    setAdditionalMedia(prev => prev.map((item, i) => i === index ? { ...item, url } : item));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    if (!primaryFile && !primaryUrl) {
      setError('Please add at least one primary image (file or URL)');
      setSaving(false);
      return;
    }

    const media: ArtworkMedia[] = [];

    if (primaryFile) {
      try {
        const uploadData = await uploadImage(token, primaryFile);
        media.push({ type: 'image', url: uploadData.imageUrl });
      } catch (e) {
        console.error('Failed to upload primary image', e);
        setError('Failed to upload primary image');
        setSaving(false);
        return;
      }
    } else if (primaryUrl) {
      media.push({ type: 'image', url: primaryUrl });
    }

    for (const item of additionalMedia) {
      if (item.file) {
        try {
          const uploadData = await uploadImage(token, item.file);
          media.push({ type: item.type, url: uploadData.imageUrl });
        } catch (e) {
          console.error(`Failed to upload ${item.type}`, e);
          setError(`Failed to upload ${item.type}`);
          setSaving(false);
          return;
        }
      } else if (item.url) {
        media.push({ type: item.type, url: item.url });
      }
    }

    const attrs: Record<string, any> = {};
    if (form.type === 'painting') {
      if (form.medium) attrs.medium = form.medium;
      if (form.canvasType) attrs.canvasType = form.canvasType;
    } else if (form.type === 'sculpture') {
      if (form.material) attrs.material = form.material;
    }
    if (form.height) attrs.height = parseFloat(form.height);
    if (form.width) attrs.width = parseFloat(form.width);
    if (form.depth) attrs.depth = parseFloat(form.depth);
    if (form.weight) attrs.weight = parseFloat(form.weight);

    const body: any = {
      title: form.title,
      type: form.type,
      style: form.style || undefined,
      description: form.description || undefined,
      price: form.price ? parseFloat(form.price) : undefined,
      imageUrl: media[0]?.url || undefined,
      media: media.length > 0 ? media : undefined,
      status: 'Pending Payment',
      yearCreated: form.yearCreated ? parseInt(form.yearCreated) : undefined,
      attributes: Object.keys(attrs).length > 0 ? attrs : undefined,
      contributorIds: selectedContributors.length > 0 ? selectedContributors : undefined,
    };

    try {
      const checkout = await createArtworkListingCheckout(token);

      const savedData = {
        ...body,
        media: media,
        contributorIds: selectedContributors,
      };
      localStorage.setItem('ggallery_pending_artwork', JSON.stringify(savedData));

      if (checkout.checkoutUrl) {
        window.location.href = checkout.checkoutUrl;
      } else {
        await confirmAndCreateArtwork(token, checkout.paymentId, savedData);
        toast('Artwork published! (Test mode)', 'success');
        onCreated();
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to publish');
    } finally {
      setSaving(false);
    }
  };

  const primaryPreview = primaryFile ? URL.createObjectURL(primaryFile) : primaryUrl;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 md:p-6 bg-zinc-900/40 backdrop-blur-sm transition-opacity"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white dark:bg-zinc-900 rounded-none sm:rounded-3xl w-full h-full sm:h-auto max-w-5xl overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200 max-h-[100vh] sm:max-h-[90vh]">
        <div className="px-6 sm:px-8 py-5 flex items-center justify-between sticky top-0 z-10 bg-white dark:bg-zinc-900 border-b sm:border-b-0 border-zinc-100 dark:border-zinc-800">
          <h2 className="text-xl sm:text-2xl font-extrabold text-zinc-900 dark:text-zinc-100 tracking-tight">
            New Artwork
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-900 dark:text-zinc-100 flex items-center justify-center transition-colors font-bold"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-8 pb-4 sm:pb-8 pt-4 sm:pt-0 custom-scrollbar">
          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 text-sm font-medium rounded-xl border border-red-100">
              {error}
            </div>
          )}

          <form id="artwork-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-5 gap-6 sm:gap-10">
            <div className="lg:col-span-2 space-y-6">
              <div>
                <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block mb-2">
                  Primary Image <span className="text-red-400">*</span>
                </label>
                <div className="group relative aspect-square bg-zinc-50 dark:bg-zinc-950 border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-3xl overflow-hidden hover:border-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-all cursor-pointer flex flex-col items-center justify-center text-center p-6">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setPrimaryFile(e.target.files[0]);
                        setPrimaryUrl('');
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  {primaryPreview ? (
                    <img src={primaryPreview} alt="Preview" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <div className="space-y-2 pointer-events-none">
                      <div className="w-12 h-12 rounded-full bg-white dark:bg-zinc-900 shadow-sm dark:shadow-zinc-900/30 flex items-center justify-center mx-auto">
                        <svg className="w-6 h-6 text-zinc-400 dark:text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Upload Image</p>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400">Click to browse</p>
                    </div>
                  )}
                  {primaryPreview && (
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center z-0">
                      <p className="text-white font-semibold text-sm">Change Image</p>
                    </div>
                  )}
                </div>

                {!primaryFile && (
                  <div className="mt-3">
                    <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block mb-1">Or paste image URL</label>
                    <input
                      value={primaryUrl}
                      onChange={(e) => {
                        setPrimaryUrl(e.target.value);
                        if (e.target.value) setPrimaryFile(null);
                      }}
                      className="w-full bg-transparent border-b border-zinc-200 dark:border-zinc-700 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:border-zinc-900 transition-colors"
                      placeholder="https://..."
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block mb-2">Additional Media <span className="text-zinc-300 dark:text-zinc-600 font-normal normal-case">(optional)</span></label>
                <div className="grid grid-cols-2 gap-3">
                  {additionalMedia.map((item, i) => (
                    <div key={i} className="relative aspect-square bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-2xl overflow-hidden group">
                      {item.file ? (
                        item.type === 'video' ? (
                          <video src={URL.createObjectURL(item.file)} className="w-full h-full object-cover" />
                        ) : (
                          <img src={URL.createObjectURL(item.file)} alt="" className="w-full h-full object-cover" />
                        )
                      ) : item.url ? (
                        item.type === 'video' ? (
                          <video src={item.url} className="w-full h-full object-cover" />
                        ) : (
                          <img src={item.url} alt="" className="w-full h-full object-cover" />
                        )
                      ) : null}
                      <div className="absolute top-2 left-2 text-[10px] font-semibold bg-black/60 text-white px-2 py-0.5 rounded-full uppercase">
                        {item.type}
                      </div>
                      <button
                        onClick={() => removeMedia(i)}
                        className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80"
                      >
                        <XIcon className="w-3 h-3" />
                      </button>
                      <input
                        value={item.url || ''}
                        onChange={(e) => updateMediaUrl(i, e.target.value)}
                        placeholder="Or paste URL..."
                        className="absolute bottom-0 inset-x-0 bg-white dark:bg-zinc-900 dark:bg-zinc-900/90 border-t border-zinc-200 dark:border-zinc-700 px-2 py-1 text-[10px] text-zinc-600 dark:text-zinc-400 placeholder-zinc-300 focus:outline-none opacity-0 group-hover:opacity-100 transition-opacity"
                      />
                    </div>
                  ))}
                  <button
                    onClick={() => addMedia('image')}
                    className="aspect-square border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl flex flex-col items-center justify-center gap-1 text-zinc-400 dark:text-zinc-500 hover:border-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-400 transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span className="text-[10px] font-semibold">Image</span>
                  </button>
                  <button
                    onClick={() => addMedia('video')}
                    className="aspect-square border-2 border-dashed border-zinc-200 dark:border-zinc-700 rounded-2xl flex flex-col items-center justify-center gap-1 text-zinc-400 dark:text-zinc-500 hover:border-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-400 transition-all"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    <span className="text-[10px] font-semibold">Video</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="lg:col-span-3 space-y-6 sm:space-y-8">
              <div className="space-y-6">
                <div>
                  <input
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    required
                    className="w-full bg-transparent border-b-2 border-zinc-200 dark:border-zinc-700 py-2 text-2xl sm:text-3xl font-bold text-zinc-900 dark:text-zinc-100 placeholder-zinc-300 focus:outline-none focus:border-black transition-colors"
                    placeholder="Artwork Title"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block mb-2">Type</label>
                  <select
                    name="type"
                    value={form.type}
                    onChange={handleChange}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 rounded-2xl p-4 text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:ring-zinc-700 transition-all"
                  >
                    {ART_TYPES.map(t => (
                      <option key={t} value={t}>{t.replace('_', ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows={3}
                    className="w-full bg-zinc-50 dark:bg-zinc-950 rounded-2xl p-4 text-sm text-zinc-700 dark:text-zinc-300 placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:ring-zinc-700 transition-all resize-none"
                    placeholder="Describe the inspiration, background, or concept..."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block mb-2">Price (₱)</label>
                    <input
                      name="price"
                      type="number"
                      value={form.price}
                      onChange={handleChange}
                      className="w-full bg-transparent border-b border-zinc-200 dark:border-zinc-700 py-2 text-lg font-semibold text-zinc-900 dark:text-zinc-100 placeholder-zinc-300 focus:outline-none focus:border-black transition-colors"
                      placeholder="0.00"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider block mb-2">Status</label>
                    <select
                      name="status"
                      value={form.status}
                      onChange={handleChange}
                      className="w-full bg-transparent border-b border-zinc-200 dark:border-zinc-700 py-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-black transition-colors appearance-none cursor-pointer"
                    >
                      <option value="Available">Available</option>
                      <option value="Sold">Sold</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-4">Specifications</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase block mb-1">Year</label>
                    <input name="yearCreated" type="number" value={form.yearCreated} onChange={handleChange} className="w-full bg-transparent border-b border-zinc-200 dark:border-zinc-700 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-black transition-colors" placeholder="e.g. 2024" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase block mb-1">Style</label>
                    <input name="style" value={form.style} onChange={handleChange} className="w-full bg-transparent border-b border-zinc-200 dark:border-zinc-700 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-black transition-colors" placeholder="e.g. Abstract" />
                  </div>

                  {form.type === 'painting' && (
                    <>
                      <div>
                        <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase block mb-1">Medium</label>
                        <input name="medium" value={form.medium} onChange={handleChange} className="w-full bg-transparent border-b border-zinc-200 dark:border-zinc-700 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-black transition-colors" placeholder="e.g. Oil" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase block mb-1">Canvas</label>
                        <input name="canvasType" value={form.canvasType} onChange={handleChange} className="w-full bg-transparent border-b border-zinc-200 dark:border-zinc-700 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-black transition-colors" placeholder="e.g. Linen" />
                      </div>
                    </>
                  )}

                  {form.type === 'sculpture' && (
                    <>
                      <div>
                        <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase block mb-1">Material</label>
                        <input name="material" value={form.material} onChange={handleChange} className="w-full bg-transparent border-b border-zinc-200 dark:border-zinc-700 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-black transition-colors" placeholder="e.g. Bronze" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase block mb-1">Weight (kg)</label>
                        <input name="weight" type="number" value={form.weight} onChange={handleChange} className="w-full bg-transparent border-b border-zinc-200 dark:border-zinc-700 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-black transition-colors" placeholder="0" />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase block mb-1">Depth (cm)</label>
                        <input name="depth" type="number" value={form.depth} onChange={handleChange} className="w-full bg-transparent border-b border-zinc-200 dark:border-zinc-700 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-black transition-colors" placeholder="0" />
                      </div>
                    </>
                  )}

                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase block mb-1">Height (cm)</label>
                    <input name="height" type="number" step="0.1" value={form.height} onChange={handleChange} className="w-full bg-transparent border-b border-zinc-200 dark:border-zinc-700 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-black transition-colors" placeholder="0" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase block mb-1">Width (cm)</label>
                    <input name="width" type="number" step="0.1" value={form.width} onChange={handleChange} className="w-full bg-transparent border-b border-zinc-200 dark:border-zinc-700 py-1.5 text-sm text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-black transition-colors" placeholder="0" />
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider mb-4">Collaborators</h3>
                <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mb-3">Search and select other exhibitors who contributed to this artwork.</p>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-zinc-200 dark:ring-zinc-700 transition-all mb-2"
                  placeholder="Search exhibitors..."
                />
                <div className="max-h-36 overflow-y-auto border border-zinc-100 dark:border-zinc-800 rounded-xl divide-y divide-zinc-100">
                  {filteredExhibitors.map(e => (
                    <label
                      key={e.id}
                      className="flex items-center gap-3 px-3 py-2 hover:bg-zinc-50 dark:hover:bg-zinc-800 cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={selectedContributors.includes(e.id)}
                        onChange={() => toggleContributor(e.id)}
                        className="rounded border-zinc-300 dark:border-zinc-600 text-zinc-900 dark:text-zinc-100 focus:ring-zinc-900"
                      />
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">{e.name}</span>
                    </label>
                  ))}
                  {filteredExhibitors.length === 0 && (
                    <p className="px-3 py-3 text-xs text-zinc-400 dark:text-zinc-500 text-center">No exhibitors found.</p>
                  )}
                </div>
                {selectedContributors.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {selectedContributors.map(id => {
                      const ex = exhibitors.find(e => e.id === id);
                      return ex ? (
                        <span key={id} className="inline-flex items-center gap-1 text-[10px] font-semibold bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 px-2 py-1 rounded-full">
                          {ex.name}
                          <button onClick={() => toggleContributor(id)} className="text-zinc-400 dark:text-zinc-500 hover:text-zinc-700"><XIcon className="w-3 h-3" /></button>
                        </span>
                      ) : null;
                    })}
                  </div>
                )}
              </div>

              <div className="pt-6">
                <button
                  type="submit"
                  form="artwork-form"
                  disabled={saving}
                  className="w-full py-4 rounded-2xl bg-black text-white text-sm font-bold hover:bg-zinc-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/10"
                >
                  {saving ? (
                    <><span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Saving...</>
                  ) : (
                    'Publish Artwork'
                  )}
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
