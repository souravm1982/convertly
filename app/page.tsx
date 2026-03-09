"use client";

import { useState } from "react";
import Link from "next/link";

interface UploadedFile {
  fileName: string;
  s3Key: string;
  size: number;
  type: string;
  url: string;
  overlayText?: string;
}

interface CreatedReel {
  videoUrl: string;
  videoKey: string;
  createdAt: number;
}

interface TextSuggestion {
  text: string;
  labels?: string[];
}

export default function Home() {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  // Reel creation states
  const [selectedForReel, setSelectedForReel] = useState<Set<number>>(new Set());
  const [creatingReel, setCreatingReel] = useState(false);
  const [createdReels, setCreatedReels] = useState<CreatedReel[]>([]);
  const [transitionDuration, setTransitionDuration] = useState(1.5);
  
  // AI text overlay states
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
    if (selectedFiles.length === 0) {
      setError('Please select at least one image');
      return;
    }

    setUploading(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const formData = new FormData();
      selectedFiles.forEach(file => {
        formData.append('files', file);
      });

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Upload failed');
      }

      setUploadedFiles([...uploadedFiles, ...result.files]);
      setSuccessMessage(result.message);
      setSelectedFiles([]);
      
      // Clear file input
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred during upload');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveSelected = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const toggleImageForReel = (index: number) => {
    const newSelected = new Set(selectedForReel);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedForReel(newSelected);
  };

  const handleCreateReel = async () => {
    if (selectedForReel.size < 2) {
      setError('Please select at least 2 images to create a reel');
      setTimeout(() => setError(null), 5000);
      return;
    }

    if (selectedForReel.size > 20) {
      setError('Maximum 20 images allowed per reel');
      setTimeout(() => setError(null), 5000);
      return;
    }

    setCreatingReel(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const selectedImages = Array.from(selectedForReel)
        .sort((a, b) => a - b)
        .map(index => uploadedFiles[index]);

      // Validate that all selected images have s3Keys
      const invalidImages = selectedImages.filter(img => !img.s3Key);
      if (invalidImages.length > 0) {
        throw new Error('Some selected images are missing S3 keys. Please try uploading them again.');
      }

      const response = await fetch('/api/create-reel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          images: selectedImages.map((img, idx) => {
            const originalIndex = Array.from(selectedForReel).sort((a, b) => a - b)[idx];
            return {
              ...img,
              overlayText: imageTexts[originalIndex],
              textPosition: textPositions[originalIndex],
              animationType: animationTypes[originalIndex]
            };
          }),
          transitionDuration,
        }),
      });

      // Check if response is JSON
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        const textResponse = await response.text();
        console.error('Non-JSON response from server:', textResponse);
        throw new Error(
          'Server error: The API returned an HTML error page instead of JSON. ' +
          'This usually means there\'s a server-side issue. Please check the browser console and server logs for details.'
        );
      }

      const result = await response.json();

      if (!response.ok) {
        // Display both error and details if available
        const errorMessage = result.details 
          ? `${result.error}: ${result.details}`
          : result.error || 'Reel creation failed';
        throw new Error(errorMessage);
      }

      setCreatedReels([
        {
          videoUrl: result.videoUrl,
          videoKey: result.videoKey,
          createdAt: Date.now(),
        },
        ...createdReels,
      ]);
      setSuccessMessage(result.message);
      setSelectedForReel(new Set());
      
      // Auto-dismiss success message after 5 seconds
      setTimeout(() => setSuccessMessage(null), 5000);
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred during reel creation';
      setError(errorMessage);
      console.error('Reel creation error:', err);
    } finally {
      setCreatingReel(false);
    }
  };

  const handleGenerateText = async (imageIndex: number) => {
    setGeneratingForIndex(imageIndex);
    setGeneratingStatus('Analyzing image...');
    setEditingTextIndex(imageIndex);
    setError(null);
    try {
      setGeneratingStatus('Detecting objects...');
      const response = await fetch('/api/generate-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ s3Key: uploadedFiles[imageIndex].s3Key }),
      });
      setGeneratingStatus('Generating suggestions...');
      const result = await response.json();
      if (!response.ok) throw new Error(result.error);
      const suggestions = result.suggestions.map((s: string) => s.replace(/^\d+\.\s*/, ''));
      setAiSuggestions({ ...aiSuggestions, [imageIndex]: suggestions });
      setTextPositions({ ...textPositions, [imageIndex]: result.textPosition || 'top' });
      setAnimationTypes({ ...animationTypes, [imageIndex]: result.animationType || 'zoom_in' });
      setTempText('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate text');
    } finally {
      setGeneratingForIndex(null);
      setGeneratingStatus('');
    }
  };

  const handleSaveText = (imageIndex: number) => {
    setImageTexts({ ...imageTexts, [imageIndex]: tempText });
    setEditingTextIndex(null);
    setTempText('');
  };

  const handleCancelEdit = () => {
    setEditingTextIndex(null);
    setTempText('');
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="z-10 max-w-5xl w-full">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-center flex-1">
            Convertly : Convert your images to Reels
          </h1>
          <Link
            href="/photo-set"
            className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-4 rounded-lg whitespace-nowrap ml-4"
          >
            📸 AI Photo Set
          </Link>
        </div>

        {/* Upload Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold mb-4">Upload Images</h2>
          
          <div className="mb-4">
            <label
              htmlFor="file-input"
              className="flex flex-col items-center justify-center w-full h-64 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-800 hover:bg-gray-100"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <svg
                  className="w-10 h-10 mb-3 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  ></path>
                </svg>
                <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  PNG, JPG, GIF, WebP (Multiple files allowed)
                </p>
              </div>
              <input
                id="file-input"
                type="file"
                className="hidden"
                multiple
                accept="image/*"
                onChange={handleFileSelect}
              />
            </label>
          </div>

          {/* Selected Files Preview */}
          {selectedFiles.length > 0 && (
            <div className="mb-4">
              <h3 className="text-lg font-semibold mb-2">
                Selected Files ({selectedFiles.length})
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {selectedFiles.map((file, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={URL.createObjectURL(file)}
                      alt={file.name}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      onClick={() => handleRemoveSelected(index)}
                      className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                    <p className="text-xs mt-1 truncate">{file.name}</p>
                    <p className="text-xs text-gray-500">{formatFileSize(file.size)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          {error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}
          
          {successMessage && (
            <div className="mb-4 p-3 bg-green-100 border border-green-400 text-green-700 rounded">
              {successMessage}
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={uploading || selectedFiles.length === 0}
            className="w-full bg-blue-500 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : `Upload ${selectedFiles.length} Image(s)`}
          </button>
        </div>

        {/* Uploaded Files Section */}
        {uploadedFiles.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-semibold">
                Uploaded Images ({uploadedFiles.length})
              </h2>
              {selectedForReel.size > 0 && (
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  {selectedForReel.size} selected for reel
                </span>
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
              {uploadedFiles.map((file, index) => (
                <div 
                  key={index} 
                  className={`border rounded-lg p-3 dark:border-gray-700 transition-all ${
                    selectedForReel.has(index) ? 'ring-2 ring-blue-500 bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="relative cursor-pointer" onClick={() => toggleImageForReel(index)}>
                    <img
                      src={file.url}
                      alt={file.fileName}
                      className="w-full h-48 object-cover rounded-lg mb-2"
                    />
                    {selectedForReel.has(index) && (
                      <div className="absolute top-2 right-2 bg-blue-500 text-white rounded-full w-8 h-8 flex items-center justify-center font-bold">
                        {Array.from(selectedForReel).sort((a, b) => a - b).indexOf(index) + 1}
                      </div>
                    )}
                  </div>
                  <p className="text-sm font-semibold truncate">{file.fileName}</p>
                  <p className="text-xs text-gray-500 mb-2">{formatFileSize(file.size)}</p>
                  
                  {editingTextIndex === index ? (
                    <div className="space-y-2">
                      {generatingForIndex === index && (
                        <div className="text-xs text-center py-3 text-purple-600 dark:text-purple-400 animate-pulse font-medium">
                          ✨ {generatingStatus}
                        </div>
                      )}
                      {aiSuggestions[index] && aiSuggestions[index].length > 0 && (
                        <div className="space-y-1">
                          <label className="text-xs font-medium">AI Suggestions (click to select):</label>
                          {aiSuggestions[index].map((suggestion, i) => (
                            <button
                              key={i}
                              onClick={() => setTempText(suggestion)}
                              className={`w-full text-left text-xs p-2 border rounded hover:bg-blue-50 dark:hover:bg-blue-900/20 ${
                                tempText === suggestion ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-500' : ''
                              }`}
                            >
                              {suggestion}
                            </button>
                          ))}
                        </div>
                      )}
                      <div>
                        <label className="text-xs font-medium">Your Text:</label>
                        <textarea
                          value={tempText}
                          onChange={(e) => setTempText(e.target.value)}
                          placeholder="Select a suggestion or write your own"
                          rows={3}
                          className="w-full text-xs px-2 py-1 border rounded dark:bg-gray-700 resize-none mt-1"
                        />
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleSaveText(index)}
                          disabled={!tempText}
                          className="flex-1 bg-green-500 hover:bg-green-600 text-white text-xs py-1 rounded disabled:opacity-50"
                        >
                          Save
                        </button>
                        <button
                          onClick={handleCancelEdit}
                          className="flex-1 bg-gray-500 hover:bg-gray-600 text-white text-xs py-1 rounded"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : imageTexts[index] ? (
                    <div className="space-y-1">
                      <div className="text-xs bg-green-50 dark:bg-green-900/20 p-2 rounded border border-green-200 dark:border-green-800 min-h-[3rem]">
                        <p className="font-semibold text-green-700 dark:text-green-300 break-words">{imageTexts[index]}</p>
                      </div>
                      <button
                        onClick={() => {
                          setEditingTextIndex(index);
                          setTempText(imageTexts[index]);
                        }}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white text-xs py-1 rounded"
                      >
                        Edit Text
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleGenerateText(index)}
                      disabled={generatingForIndex === index}
                      className="w-full bg-green-500 hover:bg-green-600 text-white text-xs py-1 px-2 rounded mb-1 disabled:opacity-50"
                    >
                      {generatingForIndex === index ? `✨ ${generatingStatus}` : '✨ AI Text Overlay'}
                    </button>
                  )}
                  
                  <a
                    href={file.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-500 hover:underline break-all block mt-1"
                  >
                    View in S3
                  </a>
                </div>
              ))}
            </div>

            {/* Reel Creation Controls */}
            <div className="border-t pt-4 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-3">Create Reel</h3>
              <div className="flex flex-col md:flex-row gap-4 items-end">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-2">
                    Transition Duration (seconds)
                  </label>
                  <input
                    type="number"
                    min="0.5"
                    max="3"
                    step="0.1"
                    value={transitionDuration}
                    onChange={(e) => setTransitionDuration(parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600"
                  />
                </div>
                <button
                  onClick={handleCreateReel}
                  disabled={creatingReel || selectedForReel.size < 2}
                  className="bg-purple-500 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                >
                  {creatingReel ? 'Creating Reel...' : `Create Reel (${selectedForReel.size} images)`}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Click on images to select for reel. Images with saved text will include overlays.
              </p>
            </div>
          </div>
        )}

        {/* Created Reels Section */}
        {createdReels.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold mb-4">
              Created Reels ({createdReels.length})
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {createdReels.map((reel, index) => (
                <div key={index} className="border rounded-lg p-4 dark:border-gray-700">
                  <video
                    controls
                    className="w-full rounded-lg mb-3"
                    src={reel.videoUrl}
                  >
                    Your browser does not support the video tag.
                  </video>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                    Created: {new Date(reel.createdAt).toLocaleString()}
                  </p>
                  <a
                    href={reel.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-500 hover:underline break-all"
                  >
                    View in S3
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}