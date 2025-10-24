
import React, { useState, useCallback } from 'react';
import { generateImageFromReferences } from './services/geminiService';
import { AspectRatio, ReferenceImage, ImagePart } from './types';

const Spinner: React.FC = () => (
  <svg className="animate-spin -ml-1 mr-3 h-8 w-8 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const App: React.FC = () => {
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // remove data:image/...;base64, prefix
        resolve(result.split(',')[1]);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    if (referenceImages.length + files.length > 4) {
      setError("You can upload a maximum of 4 images.");
      return;
    }
    setError(null);

    const newImages: ReferenceImage[] = await Promise.all(
      // FIX: Explicitly type `file` as `File` to resolve type inference issue.
      Array.from(files).map(async (file: File) => ({
        id: `${file.name}-${Date.now()}`,
        file,
        base64: await fileToBase64(file),
      }))
    );
    setReferenceImages((prev) => [...prev, ...newImages]);
    event.target.value = ''; // Reset file input
  };
  
  const handleRemoveImage = (id: string) => {
    setReferenceImages((prev) => prev.filter((img) => img.id !== id));
    if (referenceImages.length - 1 < 2) {
      setGeneratedImage(null);
    }
  };

  const handleGenerate = useCallback(async () => {
    if (referenceImages.length < 2) {
      setError("Please upload at least 2 images.");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);

    const imageParts: ImagePart[] = referenceImages.map(img => ({
      inlineData: {
        data: img.base64,
        mimeType: img.file.type,
      }
    }));

    try {
      const resultBase64 = await generateImageFromReferences(imageParts, aspectRatio);
      setGeneratedImage(resultBase64);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  }, [referenceImages, aspectRatio]);

  const handleDownload = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.href = `data:image/png;base64,${generatedImage}`;
    link.download = 'result.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const canGenerate = referenceImages.length >= 2 && referenceImages.length <= 4;

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 font-sans p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-600">
            Image Merge Reference
          </h1>
          <p className="mt-2 text-lg text-slate-400">
            Blend multiple images into one unique AI-generated creation.
          </p>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Controls Section */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-lg p-6 flex flex-col space-y-6 border border-slate-700">
            <div>
              <h2 className="text-2xl font-bold mb-3">1. Upload Images (2-4)</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4 min-h-[8rem]">
                {referenceImages.map((img) => (
                  <div key={img.id} className="relative group aspect-square">
                    <img
                      src={`data:${img.file.type};base64,${img.base64}`}
                      alt={img.file.name}
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <button
                      onClick={() => handleRemoveImage(img.id)}
                      className="absolute top-1 right-1 bg-red-600/70 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Remove image"
                    >
                      &#x2715;
                    </button>
                  </div>
                ))}
              </div>
              <label htmlFor="file-upload" className="w-full cursor-pointer bg-slate-700 hover:bg-slate-600 text-slate-200 font-bold py-3 px-4 rounded-lg transition-colors text-center block">
                {referenceImages.length > 0 ? 'Add More Images' : 'Select Images'}
              </label>
              <input 
                id="file-upload" 
                type="file" 
                multiple 
                accept=".png, .jpg, .jpeg"
                onChange={handleFileChange} 
                className="hidden"
              />
            </div>
            
            <div>
              <h2 className="text-2xl font-bold mb-3">2. Output Format</h2>
              <select
                value={aspectRatio}
                onChange={(e) => setAspectRatio(e.target.value as AspectRatio)}
                className="w-full bg-slate-700 border border-slate-600 rounded-lg p-3 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="1:1">Square (1:1)</option>
                <option value="9:16">Portrait (9:16)</option>
                <option value="16:9">Landscape (16:9)</option>
              </select>
            </div>
            
            <div>
              <button
                onClick={handleGenerate}
                disabled={!canGenerate || isLoading}
                className={`w-full text-lg font-bold py-4 px-6 rounded-lg transition-all duration-300 flex items-center justify-center
                  ${canGenerate && !isLoading ? 'bg-indigo-600 hover:bg-indigo-700 transform hover:scale-105' : 'bg-slate-600 opacity-50 cursor-not-allowed'}`}
              >
                {isLoading ? <><Spinner /> Generating...</> : 'Generate Image'}
              </button>
            </div>
          </div>

          {/* Result Section */}
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl shadow-lg p-6 flex flex-col justify-center items-center border border-slate-700 min-h-[400px] lg:min-h-full">
            {isLoading ? (
              <div className="flex flex-col items-center text-slate-300">
                <Spinner />
                <p className="mt-4 text-xl">Generating your masterpiece...</p>
                <p className="text-sm text-slate-400">This can take a moment.</p>
              </div>
            ) : error ? (
              <div className="text-center text-red-400 bg-red-900/50 border border-red-500 p-4 rounded-lg">
                <h3 className="font-bold text-lg">An Error Occurred</h3>
                <p className="text-sm">{error}</p>
              </div>
            ) : generatedImage ? (
              <div className="w-full flex flex-col items-center space-y-4">
                <h2 className="text-2xl font-bold mb-2">Result</h2>
                <img
                  src={`data:image/png;base64,${generatedImage}`}
                  alt="Generated"
                  className="max-w-full max-h-[60vh] rounded-lg shadow-2xl"
                />
                <button
                  onClick={handleDownload}
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-lg transition-colors"
                >
                  Download PNG
                </button>
              </div>
            ) : (
              <div className="text-center text-slate-500">
                <svg xmlns="http://www.w3.org/2000/svg" className="mx-auto h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="mt-4 text-xl">Your generated image will appear here</p>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default App;
