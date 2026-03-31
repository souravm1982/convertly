"use client";

import { useState } from "react";

interface UploadedFile {
  fileName: string;
  s3Key: string;
  size: number;
  type: string;
  url: string;
}

interface CreatedReel {
  videoUrl: string;
  videoKey: string;
  createdAt: number;
}

export default function ReelCreator({ meteredFetch }: { meteredFetch: typeof fetch }) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [selectedForReel, setSelectedForReel] = useState<Set<number>>(new Set());
  const [creatingReel, setCreatingReel] = useState(false);
  const [createdReels, setCreatedReels] = useState<CreatedReel[]>([]);
  const [transitionDuration, setTransitionDuration] = useState(2);
  const [reelOrder, setReelOrder] = useState<number[]>([]);
  const [imageTexts, setImageTexts] = useState<{[key: number]: string}>({});
  const [textPositions, setTextPositions] = useState<{[key: number]: string}>({});
  const [animationTypes, setAnimationTypes] = useState<{[key: number]: string}>({});
  const [editingTextIndex, setEditingTextIndex] = useState<number | null>(null);
  const [tempText, setTempText] = useState('');
  const [generatingForIndex, setGeneratingForIndex] = useState<number | null>(null);
  const [generatingStatus, setGeneratingStatus] = useState('');
  const [aiSuggestions, setAiSuggestions] = useState<{[key: number]: string[]}>({});

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) {
      const filesArray = Array.from(event.target.files);
      const imageFiles = filesArray.filter(file => file.type.startsWith('image/'));
      if (imageFiles.length !== filesArray.length) {
        setError('Only image files are allowed');
        setTimeout(() => setError(null), 3000);
      }
      setSelectedFiles(imageFiles);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) { setError('Please select at least one image'); return; }
    setUploading(true); setError(null); setSuccessMessage(null);
    try {
      const formData = new FormData();
      selectedFiles.forEach(file => formData.append('files', file));
      const response = await meteredFetch('/api/upload', { method: 'POST', body: formData });
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || result.error || 'Upload failed');
      setUploadedFiles([...uploadedFiles, ...result.files]);
      setSuccessMessage(result.message);
      setSelectedFiles([]);
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally { setUploading(false); }
  };

  const handleRemoveSelected = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const toggleImageForReel = (index: number) => {
    const newSelected = new Set(selectedForReel);
    if (newSelected.has(index)) {
      newSelected.delete(index);
      setReelOrder(reelOrder.filter(i => i !== index));
    } else {
      newSelected.add(index);
      setReelOrder([...reelOrder, index]);
    }
    setSelectedForReel(newSelected);
  };

  const moveInOrder = (from: number, direction: 'up' | 'down') => {
    const newOrder = [...reelOrder];
    const to = direction === 'up' ? from - 1 : from + 1;
    if (to < 0 || to >= newOrder.length) return;
    [newOrder[from], newOrder[to]] = [newOrder[to], newOrder[from]];
    setReelOrder(newOrder);
  };

  const handleCreateReel = async () => {
    if (selectedForReel.size < 2) { setError('Please select at least 2 images'); setTimeout(() => setError(null), 5000); return; }
    if (selectedForReel.size > 20) { setError('Maximum 20 images allowed'); setTimeout(() => setError(null), 5000); return; }
    setCreatingReel(true); setError(null); setSuccessMessage(null);
    try {
      const orderedIndices = reelOrder.length > 0 ? reelOrder : Array.from(selectedForReel).sort((a, b) => a - b);
      const selectedImages = orderedIndices.map(index => uploadedFiles[index]);
      const invalidImages = selectedImages.filter(img => !img.s3Key);
      if (invalidImages.length > 0) throw new Error('Some images are missing S3 keys.');
      const response = await meteredFetch('/api/create-reel', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images: selectedImages.map((img, idx) => {
            const originalIndex = orderedIndices[idx];
            return { ...img, overlayText: imageTexts[originalIndex], textPosition: textPositions[originalIndex], animationType: animationTypes[originalIndex] };
          }),
          transitionDuration,
        }),
      });
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) throw new Error('Server returned an error page.');
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || result.details || result.error);
      setCreatedReels([{ videoUrl: result.videoUrl, videoKey: result.videoKey, createdAt: Date.now() }, ...createdReels]);
      setSuccessMessage(result.message);
      setSelectedForReel(new Set());
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reel creation failed');
    } finally { setCreatingReel(false); }
  };

  const handleGenerateText = async (imageIndex: number) => {
    setGeneratingForIndex(imageIndex); setGeneratingStatus('Analyzing image...'); setEditingTextIndex(imageIndex); setError(null);
    try {
      setGeneratingStatus('Detecting objects...');
      const response = await meteredFetch('/api/generate-text', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ s3Key: uploadedFiles[imageIndex].s3Key }) });
      setGeneratingStatus('Generating suggestions...');
      const result = await response.json();
      if (!response.ok) throw new Error(result.message || result.error);
      const suggestions = result.suggestions.map((s: string) => s.replace(/^\d+\.\s*/, ''));
      setAiSuggestions({ ...aiSuggestions, [imageIndex]: suggestions });
      setTextPositions({ ...textPositions, [imageIndex]: result.textPosition || 'top' });
      setAnimationTypes({ ...animationTypes, [imageIndex]: result.animationType || 'zoom_in' });
      setTempText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate text');
    } finally { setGeneratingForIndex(null); setGeneratingStatus(''); }
  };

  const handleSaveText = (imageIndex: number) => { setImageTexts({ ...imageTexts, [imageIndex]: tempText }); setEditingTextIndex(null); setTempText(''); };
  const handleCancelEdit = () => { setEditingTextIndex(null); setTempText(''); };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024; const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="text-center mb-2">
        <h2 className="text-2xl font-bold text-gray-900">Create Stunning Reels</h2>
        <p className="text-gray-500 mt-1">Upload your images, add AI text overlays, and generate professional reels in seconds.</p>
      </div>

      {/* Upload */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
        <label
          htmlFor="file-input"
          className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-violet-300 hover:bg-violet-50/30 transition-all"
        >
          <div className="flex flex-col items-center">
            <div className="w-12 h-12 bg-violet-50 rounded-full flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-violet-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <p className="text-sm text-gray-600"><span className="font-semibold text-violet-600">Click to upload</span> or drag and drop</p>
            <p className="text-xs text-gray-400 mt-1">PNG, JPG, GIF, WebP — Multiple files</p>
          </div>
          <input id="file-input" type="file" className="hidden" multiple accept="image/*" onChange={handleFileSelect} />
        </label>

        {selectedFiles.length > 0 && (
          <div className="mt-4">
            <p className="text-sm font-medium text-gray-700 mb-2">Selected ({selectedFiles.length})</p>
            <div className="grid grid-cols-3 md:grid-cols-5 gap-3">
              {selectedFiles.map((file, index) => (
                <div key={index} className="relative group">
                  <img src={URL.createObjectURL(file)} alt={file.name} className="w-full h-24 object-cover rounded-lg" />
                  <button onClick={() => handleRemoveSelected(index)} className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity">×</button>
                  <p className="text-[10px] text-gray-500 mt-1 truncate">{file.name}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {error && <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-600 rounded-xl text-sm">{error}</div>}
        {successMessage && <div className="mt-4 p-3 bg-green-50 border border-green-200 text-green-600 rounded-xl text-sm">{successMessage}</div>}

        <button
          onClick={handleUpload}
          disabled={uploading || selectedFiles.length === 0}
          className="w-full mt-4 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold py-3 rounded-xl disabled:opacity-50 hover:shadow-lg hover:shadow-violet-200 transition-all"
        >
          {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} Image(s)`}
        </button>
      </div>

      {/* Uploaded Images */}
      {uploadedFiles.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">Your Images ({uploadedFiles.length})</h3>
            {selectedForReel.size > 0 && (
              <span className="text-sm text-violet-600 font-medium">{selectedForReel.size} selected</span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {uploadedFiles.map((file, index) => (
              <div key={index} className={`rounded-xl border p-3 transition-all ${selectedForReel.has(index) ? 'ring-2 ring-violet-500 bg-violet-50/50 border-violet-200' : 'border-gray-100 hover:border-gray-200'}`}>
                <div className="relative cursor-pointer" onClick={() => toggleImageForReel(index)}>
                  <img src={file.url} alt={file.fileName} className="w-full h-44 object-cover rounded-lg" />
                  {selectedForReel.has(index) && (
                    <div className="absolute top-2 right-2 bg-violet-500 text-white rounded-full w-7 h-7 flex items-center justify-center text-sm font-bold">
                      {reelOrder.indexOf(index) + 1}
                    </div>
                  )}
                </div>
                <p className="text-sm font-medium text-gray-800 mt-2 truncate">{file.fileName}</p>
                <p className="text-xs text-gray-400">{formatFileSize(file.size)}</p>

                {editingTextIndex === index ? (
                  <div className="mt-2 space-y-2">
                    {generatingForIndex === index && (
                      <div className="text-xs text-center py-2 text-violet-500 animate-pulse font-medium">✨ {generatingStatus}</div>
                    )}
                    {aiSuggestions[index]?.length > 0 && (
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-gray-600">AI Suggestions:</label>
                        {aiSuggestions[index].map((s, i) => (
                          <button key={i} onClick={() => setTempText(s)} className={`w-full text-left text-xs p-2 border rounded-lg transition-all ${tempText === s ? 'bg-violet-50 border-violet-300' : 'hover:bg-gray-50'}`}>{s}</button>
                        ))}
                      </div>
                    )}
                    <textarea value={tempText} onChange={(e) => setTempText(e.target.value)} placeholder="Select a suggestion or write your own" rows={2} className="w-full text-xs px-3 py-2 border border-gray-200 rounded-lg resize-none focus:ring-2 focus:ring-violet-200 focus:border-violet-300 outline-none" />
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveText(index)} disabled={!tempText} className="flex-1 bg-violet-500 text-white text-xs py-1.5 rounded-lg disabled:opacity-50">Save</button>
                      <button onClick={handleCancelEdit} className="flex-1 bg-gray-100 text-gray-600 text-xs py-1.5 rounded-lg">Cancel</button>
                    </div>
                  </div>
                ) : imageTexts[index] ? (
                  <div className="mt-2 space-y-1">
                    <div className="text-xs bg-green-50 p-2 rounded-lg border border-green-100">
                      <p className="font-medium text-green-700 break-words">{imageTexts[index]}</p>
                    </div>
                    <button onClick={() => { setEditingTextIndex(index); setTempText(imageTexts[index]); }} className="w-full bg-gray-50 hover:bg-gray-100 text-gray-600 text-xs py-1.5 rounded-lg transition-all">Edit Text</button>
                  </div>
                ) : (
                  <button onClick={() => handleGenerateText(index)} disabled={generatingForIndex === index} className="w-full mt-2 bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white text-xs py-1.5 rounded-lg disabled:opacity-50 hover:shadow-md transition-all">
                    {generatingForIndex === index ? `✨ ${generatingStatus}` : '✨ AI Text Overlay'}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Reel Order */}
          {reelOrder.length > 1 && (
            <div className="border-t border-gray-100 pt-4">
              <h3 className="text-base font-bold text-gray-900 mb-3">Reel Order</h3>
              <div className="space-y-2">
                {reelOrder.map((imgIndex, orderPos) => (
                  <div key={imgIndex} className="flex items-center gap-3 bg-gray-50 rounded-lg p-2">
                    <img src={uploadedFiles[imgIndex].url} alt="" className="w-12 h-12 object-cover rounded" />
                    <span className="text-sm font-medium text-gray-700 flex-1 truncate">{orderPos + 1}. {uploadedFiles[imgIndex].fileName}</span>
                    <div className="flex gap-1">
                      <button onClick={() => moveInOrder(orderPos, 'up')} disabled={orderPos === 0} className="text-xs px-2 py-1 bg-white border border-gray-200 rounded disabled:opacity-30">↑</button>
                      <button onClick={() => moveInOrder(orderPos, 'down')} disabled={orderPos === reelOrder.length - 1} className="text-xs px-2 py-1 bg-white border border-gray-200 rounded disabled:opacity-30">↓</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reel Controls */}
          <div className="border-t border-gray-100 pt-4">
            <h3 className="text-base font-bold text-gray-900 mb-3">Create Reel</h3>
            <div className="flex flex-col md:flex-row gap-4 items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-600 mb-1">Transition (seconds)</label>
                <input type="number" min="0.5" max="3" step="0.1" value={transitionDuration} onChange={(e) => setTransitionDuration(parseFloat(e.target.value))} className="w-full px-3 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-violet-200 focus:border-violet-300 outline-none" />
              </div>
              <button onClick={handleCreateReel} disabled={creatingReel || selectedForReel.size < 2} className="bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white font-semibold py-2.5 px-8 rounded-xl disabled:opacity-50 hover:shadow-lg hover:shadow-violet-200 transition-all whitespace-nowrap">
                {creatingReel ? 'Creating...' : `Create Reel (${selectedForReel.size} images)`}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">Click images to select, then reorder above. Text overlays will be included.</p>
          </div>
        </div>
      )}

      {/* Created Reels */}
      {createdReels.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Your Reels ({createdReels.length})</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {createdReels.map((reel, index) => (
              <div key={index} className="rounded-xl border border-gray-100 p-4">
                <video controls className="w-full rounded-lg mb-3" src={reel.videoUrl} />
                <p className="text-xs text-gray-400">{new Date(reel.createdAt).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
