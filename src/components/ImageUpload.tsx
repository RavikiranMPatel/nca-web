import { useState, useRef } from "react";
import { Upload, X, Check, Crop, Image as ImageIcon } from "lucide-react";
import api from "../api/axios";
import Cropper from "react-easy-crop";

type ImageUploadProps = {
  currentUrl?: string;
  uploadType:
    | "logo"
    | "slider"
    | "hero"
    | "team"
    | "testimonial"
    | "gallery"
    | "news";
  onUploadSuccess: (url: string) => void;
  label?: string;
  helpText?: string;
  maxSizeMB?: number;
};

function ImageUpload({
  currentUrl,
  uploadType,
  onUploadSuccess,
  label = "Upload Image",
  helpText,
  maxSizeMB = 5,
}: ImageUploadProps) {
  const getImageUrl = (url: string | undefined) => {
    if (!url) return null;
    if (url.startsWith("http")) return url;
    return url;
  };

  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(
    getImageUrl(currentUrl),
  );
  const [error, setError] = useState<string | null>(null);

  // Crop state
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  // 🆕 NEW: Upload mode selection
  const [showCropChoice, setShowCropChoice] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ----------------------------
  // Crop Helpers
  // ----------------------------

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.src = url;
      image.onload = () => resolve(image);
      image.onerror = reject;
    });

  const getCroppedImage = async () => {
    if (!selectedImage || !croppedAreaPixels) return null;

    const img = await createImage(selectedImage);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = croppedAreaPixels.width;
    canvas.height = croppedAreaPixels.height;

    ctx?.drawImage(
      img,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
    );

    return new Promise<Blob>((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
      }, "image/jpeg");
    });
  };

  const handleCropSave = async () => {
    if (!selectedImage) return;

    const croppedBlob = await getCroppedImage();
    if (!croppedBlob) return;

    const formData = new FormData();
    formData.append("file", croppedBlob, "slider.jpg");

    setUploading(true);

    try {
      const response = await api.post(
        `/admin/images/upload/${uploadType}`,
        formData,
      );

      const imageUrl = response.data.url;
      setPreviewUrl(imageUrl);
      onUploadSuccess(imageUrl);
    } catch (err: any) {
      setError(err.response?.data?.message || "Upload failed");
    } finally {
      setUploading(false);
      setSelectedImage(null);
    }
  };

  // ----------------------------
  // 🆕 Upload Full Image (No Crop)
  // ----------------------------
  const uploadFullImage = async (file: File) => {
    setUploading(true);
    setShowCropChoice(false);
    setPendingFile(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await api.post(
        `/admin/images/upload/${uploadType}`,
        formData,
      );

      const imageUrl = response.data.url;
      setPreviewUrl(imageUrl);
      onUploadSuccess(imageUrl);
    } catch (err: any) {
      setError(err.response?.data?.message || "Upload failed");
      setPreviewUrl(null);
    } finally {
      setUploading(false);
    }
  };

  // ----------------------------
  // File Selection
  // ----------------------------

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File size must be less than ${maxSizeMB}MB`);
      return;
    }

    setError(null);

    // 🔥 If slider → Show choice modal (crop or full upload)
    if (uploadType === "slider") {
      setPendingFile(file);
      setShowCropChoice(true);
      return;
    }

    // 🔥 Other types → Normal upload
    uploadFullImage(file);
  };

  const handleCropChoice = () => {
    if (!pendingFile) return;

    const reader = new FileReader();
    reader.onload = () => {
      setSelectedImage(reader.result as string);
      setShowCropChoice(false);
    };
    reader.readAsDataURL(pendingFile);
  };

  const handleFullUploadChoice = () => {
    if (!pendingFile) return;
    uploadFullImage(pendingFile);
  };

  const handleRemove = () => {
    setPreviewUrl(null);
    onUploadSuccess("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  // ----------------------------
  // UI
  // ----------------------------

  return (
    <div className="space-y-3">
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}

      <div className="flex items-start gap-4">
        <div className="relative">
          {previewUrl ? (
            <div className="relative group">
              <img
                src={previewUrl}
                alt="Preview"
                className="w-32 h-32 object-cover rounded-lg border-2 border-gray-200"
              />
              <button
                onClick={handleRemove}
                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
              >
                <X size={16} />
              </button>
            </div>
          ) : (
            <div className="w-32 h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center bg-gray-50">
              <Upload className="text-gray-400" size={32} />
            </div>
          )}
        </div>

        <div className="flex-1 space-y-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          <button
            onClick={handleButtonClick}
            disabled={uploading}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
          >
            {uploading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Uploading...
              </>
            ) : (
              <>
                <Upload size={16} />
                {previewUrl ? "Change Image" : "Choose Image"}
              </>
            )}
          </button>

          {helpText && <p className="text-xs text-gray-500">{helpText}</p>}

          {error && <p className="text-xs text-red-600">{error}</p>}

          {!uploading && !error && previewUrl && (
            <p className="text-xs text-green-600 flex items-center gap-1">
              <Check size={14} />
              Image uploaded successfully
            </p>
          )}
        </div>
      </div>

      {/* 🆕 CHOICE MODAL: Crop or Upload Full */}
      {showCropChoice && pendingFile && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6">
            <h3 className="text-lg font-bold mb-4">
              How do you want to upload this image?
            </h3>

            <div className="space-y-3 mb-6">
              {/* Option 1: Upload Full */}
              <button
                onClick={handleFullUploadChoice}
                className="w-full p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <ImageIcon size={20} className="text-blue-600" />
                  </div>
                  <div>
                    <div className="font-semibold mb-1">Upload Full Image</div>
                    <div className="text-sm text-gray-600">
                      Keep the entire image. The slider will automatically fit
                      it.
                      <span className="block text-xs text-blue-600 mt-1">
                        ✓ Recommended - No cropping needed
                      </span>
                    </div>
                  </div>
                </div>
              </button>

              {/* Option 2: Crop First */}
              <button
                onClick={handleCropChoice}
                className="w-full p-4 border-2 border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-left"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Crop size={20} className="text-green-600" />
                  </div>
                  <div>
                    <div className="font-semibold mb-1">Crop to Fit Slider</div>
                    <div className="text-sm text-gray-600">
                      Manually crop the image to 16:6 ratio for precise framing.
                      <span className="block text-xs text-gray-500 mt-1">
                        Use this if you want specific framing
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            </div>

            <button
              onClick={() => {
                setShowCropChoice(false);
                setPendingFile(null);
              }}
              className="w-full px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* 🔥 CROP MODAL (when user chooses to crop) */}
      {selectedImage && uploadType === "slider" && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl w-[90%] max-w-3xl">
            <h3 className="text-lg font-bold mb-4">Crop Your Image</h3>

            <div className="relative w-full h-[400px] bg-gray-100 rounded-lg overflow-hidden">
              <Cropper
                image={selectedImage}
                crop={crop}
                zoom={zoom}
                aspect={16 / 6}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_, areaPixels) =>
                  setCroppedAreaPixels(areaPixels)
                }
              />
            </div>

            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Zoom
              </label>
              <input
                type="range"
                min={1}
                max={3}
                step={0.1}
                value={zoom}
                onChange={(e) => setZoom(Number(e.target.value))}
                className="w-full"
              />
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setSelectedImage(null)}
                className="px-4 py-2 bg-gray-200 rounded-lg hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleCropSave}
                disabled={uploading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
              >
                {uploading ? "Uploading..." : "Crop & Upload"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ImageUpload;
