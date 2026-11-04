import { DrawerPortal } from './common/DrawerPortal';
import { ModuleWorkspace } from './common/ModuleWorkspace';

import React, { useState, useEffect, useRef } from 'react';
import { dbService, DEFAULT_BRANDING, applyFaviconAndTitle } from '../services/dbService';
import { SettingItem, BrandingConfig } from '../types';
import { 
  Plus, 
  Trash2, 
  Settings as SettingsIcon, 
  Edit2, 
  Check, 
  X, 
  Upload, 
  Image as ImageIcon, 
  Palette, 
  CheckCircle2, 
  RefreshCw,
  Globe
} from 'lucide-react';

type TabType = 'branding' | SettingItem['category'];

const CATEGORIES: { id: TabType; label: string }[] = [
  { id: 'branding', label: 'Branding & Logo' },
  { id: 'issue_category', label: 'Categories' },
  { id: 'segment', label: 'Segments' },
  { id: 'priority', label: 'Priorities' },
  { id: 'status', label: 'Statuses' },
  { id: 'assigned_person', label: 'Assigned Persons' },
  { id: 'system_name', label: 'Systems' },
];

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<SettingItem[]>([]);
  const [activeCategory, setActiveCategory] = useState<TabType>('branding');
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<{show: boolean, id: string | null}>({ show: false, id: null });

  // Branding State
  const [brandingForm, setBrandingForm] = useState<BrandingConfig>(() => dbService.getCachedBranding());
  const [isSavingBranding, setIsSavingBranding] = useState(false);
  const [brandingSavedSuccess, setBrandingSavedSuccess] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [logoUrlInput, setLogoUrlInput] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadSettings();
    loadBranding();
  }, []);

  const loadSettings = async () => {
    const data = await dbService.getSettings();
    setSettings(data);
  };

  const loadBranding = async () => {
    const b = await dbService.getBranding();
    setBrandingForm(b);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || activeCategory === 'branding') return;
    await dbService.saveSetting({ category: activeCategory as SettingItem['category'], name: newName.trim() });
    setNewName('');
    loadSettings();
  };

  const handleDelete = (id: string) => {
    setShowDeleteConfirm({ show: true, id });
  };

  const confirmDelete = async () => {
    if (showDeleteConfirm.id) {
      await dbService.deleteSetting(showDeleteConfirm.id);
      setShowDeleteConfirm({ show: false, id: null });
      loadSettings();
    }
  };

  const startEditing = (item: SettingItem) => {
    setEditingId(item.id);
    setEditingName(item.name);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setEditingName('');
  };

  const handleUpdate = async (id: string) => {
    if (!editingName.trim()) return;
    await dbService.updateSetting(id, editingName.trim());
    setEditingId(null);
    setEditingName('');
    loadSettings();
  };

  // Branding Logo Handlers
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (PNG, JPG, SVG, WebP, etc.)');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        // Optimize and compress for swift DB storage & clean favicon display
        const canvas = document.createElement('canvas');
        const MAX_DIM = 256;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/png');
          setBrandingForm(prev => ({ ...prev, logo_url: dataUrl }));
        } else {
          setBrandingForm(prev => ({ ...prev, logo_url: event.target?.result as string }));
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setBrandingForm(prev => ({ ...prev, logo_url: null }));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleApplyUrl = () => {
    if (logoUrlInput.trim()) {
      setBrandingForm(prev => ({ ...prev, logo_url: logoUrlInput.trim() }));
      setLogoUrlInput('');
      setShowUrlInput(false);
    }
  };

  const handleSaveBranding = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingBranding(true);
    setBrandingSavedSuccess(false);

    try {
      const updated = await dbService.saveBranding({
        brand_name: brandingForm.brand_name.trim() || DEFAULT_BRANDING.brand_name,
        subtitle: brandingForm.subtitle.trim(),
        logo_url: brandingForm.logo_url
      });
      setBrandingForm(updated);
      setBrandingSavedSuccess(true);
      setTimeout(() => setBrandingSavedSuccess(false), 3500);
    } catch (err) {
      console.error('Error saving branding:', err);
      alert('Failed to save branding. Check console for details.');
    } finally {
      setIsSavingBranding(false);
    }
  };

  const handleResetToDefault = async () => {
    if (confirm('Reset branding to default "Issue Tracker" and "INOVACE"?')) {
      setIsSavingBranding(true);
      try {
        const updated = await dbService.saveBranding(DEFAULT_BRANDING);
        setBrandingForm(updated);
        setBrandingSavedSuccess(true);
        setTimeout(() => setBrandingSavedSuccess(false), 3000);
      } finally {
        setIsSavingBranding(false);
      }
    }
  };

  const currentCategorySettings = settings.filter(s => s.category === activeCategory);

  return (
    <ModuleWorkspace data-ui="v2" id="Settings" number="12" title="Workspace preferences" description="Make this workspace yours. Manage brand identity and shared options." category="Administration" kind="settings" links={[]}><div className="v2-page-content">
      <div className="preferences-shell">
        <div className="p-6 md:p-8 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center shrink-0">
              <SettingsIcon size={24} />
            </div>
            <div>
              <h2 className="v2-heading text-2xl font-bold dark:text-white">System Settings</h2>
              <p className="text-slate-500 text-sm">Configure brand identity, sidebar logo, and dropdown options.</p>
            </div>
          </div>
        </div>

        <div className="preferences-layout">
          {/* Sidebar Tabs */}
          <div className="preferences-nav">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => {
                  setActiveCategory(cat.id);
                  cancelEditing();
                }}
                className={"v2-button " + (`w-full text-left px-4 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-between ${
                  activeCategory === cat.id
                    ? 'bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-sm border border-slate-200 dark:border-slate-700'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`)}
              >
                <span className="flex items-center gap-2">
                  {cat.id === 'branding' && <Palette size={15} className="text-indigo-500" />}
                  {cat.label}
                </span>
              </button>
            ))}
          </div>

          {/* Main Content */}
          <div className="preferences-panel">
            {activeCategory === 'branding' ? (
              <div className="space-y-8 animate-in fade-in duration-300">
                {brandingSavedSuccess && (
                  <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2.5 animate-in slide-in-from-top-2">
                    <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                    <span className="font-semibold">
                      Branding saved successfully! Sidebar and Favicon updated in real-time.
                    </span>
                  </div>
                )}

                <form onSubmit={handleSaveBranding} className="v2-form space-y-6">
                  {/* Brand Name & Subtitle inputs */}
                  <div className="v2-grid grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="v2-label text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        Brand Name (System Title) *
                      </label>
                      <input
                        type="text"
                        required
                        value={brandingForm.brand_name}
                        onChange={(e) => setBrandingForm({ ...brandingForm, brand_name: e.target.value })}
                        placeholder="e.g. Issue Tracker"
                        className="v2-control w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white text-sm"
                      />
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        Appears as the primary title on the sidebar & browser tab.
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="v2-label text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        Subtitle / Tagline
                      </label>
                      <input
                        type="text"
                        value={brandingForm.subtitle}
                        onChange={(e) => setBrandingForm({ ...brandingForm, subtitle: e.target.value })}
                        placeholder="e.g. INOVACE"
                        className="v2-control w-full px-3.5 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all dark:text-white text-sm"
                      />
                      <span className="text-[11px] text-slate-400 dark:text-slate-500">
                        Shown beneath the brand name in uppercase tracking.
                      </span>
                    </div>
                  </div>

                  {/* Logo Upload & Favicon Section */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="v2-label text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                        <ImageIcon size={14} className="text-indigo-500" />
                        Logo & Favicon Image
                      </label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setShowUrlInput(!showUrlInput)}
                          className="v2-button text-xs text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                        >
                          <Globe size={12} />
                          {showUrlInput ? 'Hide URL input' : 'Or use Image URL'}
                        </button>
                      </div>
                    </div>

                    {showUrlInput && (
                      <div className="flex gap-2 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-700">
                        <input
                          type="url"
                          value={logoUrlInput}
                          onChange={(e) => setLogoUrlInput(e.target.value)}
                          placeholder="https://example.com/logo.png"
                          className="v2-control flex-1 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                        />
                        <button
                          type="button"
                          onClick={handleApplyUrl}
                          className="v2-button v2-primary px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors"
                        >
                          Apply URL
                        </button>
                      </div>
                    )}

                    <div className="flex flex-col sm:flex-row items-center gap-4 p-4 border border-dashed border-slate-200 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/20">
                      {/* Logo Preview */}
                      <div className="relative group shrink-0">
                        {brandingForm.logo_url ? (
                          <div className="v2-surface w-20 h-20 rounded-2xl border-2 border-indigo-200 dark:border-indigo-800 bg-white dark:bg-slate-800 p-2 shadow-sm flex items-center justify-center overflow-hidden">
                            <img
                              src={brandingForm.logo_url}
                              alt="Logo preview"
                              className="w-full h-full object-contain rounded-lg"
                            />
                          </div>
                        ) : (
                          <div className="w-20 h-20 rounded-2xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center text-slate-400">
                            <ImageIcon size={24} />
                            <span className="text-[10px] mt-1 font-semibold">No Logo</span>
                          </div>
                        )}
                      </div>

                      {/* Upload Controls */}
                      <div className="flex-1 space-y-2 text-center sm:text-left">
                        <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/svg+xml,image/webp,image/x-icon"
                            onChange={handleLogoUpload}
                            className="v2-control hidden"
                            id="logo-upload-input"
                          />
                          <label
                            htmlFor="logo-upload-input"
                            className="v2-label px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5 shadow-sm transition-colors"
                          >
                            <Upload size={14} />
                            Upload Logo Image
                          </label>

                          {brandingForm.logo_url && (
                            <button
                              type="button"
                              onClick={handleRemoveLogo}
                              className="v2-button px-3.5 py-2 border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5"
                            >
                              <Trash2 size={13} />
                              Remove Logo
                            </button>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          Recommended: Square image (e.g. 256x256) in PNG, SVG, or JPG format. It will automatically scale for the sidebar and browser favicon.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Live Sidebar & Browser Tab Mockup Preview */}
                  <div className="space-y-3">
                    <label className="v2-label text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                      Live Preview (Sidebar & Browser Tab)
                    </label>

                    <div className="v2-grid grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Sidebar Header Preview */}
                      <div className="v2-surface p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                          Sidebar Header Preview
                        </div>
                        <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-3">
                          {brandingForm.logo_url ? (
                            <img
                              src={brandingForm.logo_url}
                              alt="Logo"
                              className="w-9 h-9 rounded-lg object-contain bg-white dark:bg-slate-800 p-0.5 border border-slate-200 dark:border-slate-700 shadow-xs"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white font-bold text-sm shadow-xs">
                              {(brandingForm.brand_name || 'I').charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <h4 className="v2-heading font-bold text-sm tracking-tight text-slate-900 dark:text-white leading-tight truncate">
                              {brandingForm.brand_name || 'Issue Tracker'}
                            </h4>
                            {brandingForm.subtitle ? (
                              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.18em] truncate block mt-0.5">
                                {brandingForm.subtitle}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      </div>

                      {/* Browser Tab Preview */}
                      <div className="v2-surface p-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                        <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
                          Browser Tab Favicon Preview
                        </div>
                        <div className="p-3 bg-slate-100 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center">
                          <div className="v2-surface bg-white dark:bg-slate-800 px-3 py-2 rounded-t-lg border-t border-x border-slate-200 dark:border-slate-700 flex items-center gap-2 max-w-[200px] shadow-xs">
                            {brandingForm.logo_url ? (
                              <img
                                src={brandingForm.logo_url}
                                alt="Favicon"
                                className="w-4 h-4 rounded-sm object-contain"
                              />
                            ) : (
                              <div className="w-4 h-4 rounded-sm bg-indigo-600 flex items-center justify-center text-[9px] text-white font-bold">
                                {(brandingForm.brand_name || 'I').charAt(0).toUpperCase()}
                              </div>
                            )}
                            <span className="text-xs font-medium text-slate-700 dark:text-slate-200 truncate">
                              {brandingForm.brand_name || 'Issue Tracker'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 dark:border-slate-800">
                    <button
                      type="button"
                      onClick={handleResetToDefault}
                      disabled={isSavingBranding}
                      className="v2-button px-4 py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 transition-colors flex items-center gap-1.5"
                    >
                      <RefreshCw size={13} />
                      Reset to Default
                    </button>

                    <button
                      type="submit"
                      disabled={isSavingBranding}
                      className="v2-button v2-primary px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-lg hover:shadow-indigo-500/25 transition-all flex items-center gap-2 text-sm disabled:opacity-50"
                    >
                      {isSavingBranding ? (
                        <>
                          <RefreshCw size={16} className="animate-spin" />
                          Saving Branding...
                        </>
                      ) : (
                        <>
                          <Check size={16} />
                          Save Branding & Apply
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* Option Categories (Existing Settings) */
              <div className="space-y-6">
                <form onSubmit={handleAdd} className="v2-form flex gap-3">
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder={`Add new ${CATEGORIES.find(c => c.id === activeCategory)?.label.toLowerCase()}...`}
                    className="v2-control flex-1 px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-900 dark:text-white"
                  />
                  <button
                    type="submit"
                    className="v2-button v2-primary px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-colors flex items-center gap-2 cursor-pointer"
                  >
                    <Plus size={18} />
                    Add
                  </button>
                </form>

                <div className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                  <table className="v2-ledger w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800">
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase">Option Name</th>
                        <th className="px-6 py-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:border-slate-800">
                      {currentCategorySettings.length > 0 ? (
                        currentCategorySettings.map(item => (
                          <tr key={item.id} className="hover:bg-white dark:hover:bg-slate-800/50 transition-colors">
                            <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                              {editingId === item.id ? (
                                <input
                                  type="text"
                                  value={editingName}
                                  onChange={(e) => setEditingName(e.target.value)}
                                  className="v2-control w-full px-3 py-1 bg-white dark:bg-slate-700 border border-indigo-500 rounded-lg outline-none text-slate-900 dark:text-white"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleUpdate(item.id);
                                    if (e.key === 'Escape') cancelEditing();
                                  }}
                                />
                              ) : (
                                item.name
                              )}
                            </td>
                            <td className="px-6 py-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                {editingId === item.id ? (
                                  <>
                                    <button
                                      onClick={() => handleUpdate(item.id)}
                                      className="v2-button p-2 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-colors"
                                      title="Save"
                                    >
                                      <Check size={16} />
                                    </button>
                                    <button
                                      onClick={cancelEditing}
                                      className="v2-button p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                      title="Cancel"
                                    >
                                      <X size={16} />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <button
                                      onClick={() => startEditing(item)}
                                      className="v2-button p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition-colors"
                                      title="Edit"
                                    >
                                      <Edit2 size={16} />
                                    </button>
                                    <button
                                      onClick={() => handleDelete(item.id)}
                                      className="v2-button p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-colors"
                                      title="Delete"
                                    >
                                      <Trash2 size={16} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={2} className="px-6 py-8 text-center text-slate-400 text-sm italic">
                            No options added for this category yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm.show && (
        <DrawerPortal><div className="v2-overlay fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="v2-surface bg-white dark:bg-slate-900 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800 animate-in zoom-in-95 duration-200">
            <div className="p-8 text-center">
              <div className="w-16 h-16 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={32} />
              </div>
              <h3 className="v2-heading text-xl font-bold text-slate-900 dark:text-white mb-2">Delete Option</h3>
              <p className="text-slate-500 dark:text-slate-400">
                Are you sure you want to delete this option? This may affect existing reports that use it.
              </p>
              <div className="flex gap-3 mt-8">
                <button 
                  onClick={() => setShowDeleteConfirm({ show: false, id: null })}
                  className="v2-button flex-1 px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={confirmDelete}
                  className="v2-button v2-primary flex-1 px-4 py-3 bg-rose-600 text-white font-bold rounded-xl shadow-lg hover:bg-rose-700 transition-colors"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div></DrawerPortal>
      )}
    </div></ModuleWorkspace>
  );
};

export default Settings;

