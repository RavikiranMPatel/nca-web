import { useEffect, useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import type { Area } from "react-easy-crop";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../../api/axios";
import PlayerForm from "../../components/player/PlayerForm";
import type { PlayerFormData } from "../../api/playerService/playerService";
import { getImageUrl } from "../../utils/imageUrl";

function UpdatePlayer() {
  const navigate = useNavigate();
  const { playerPublicId } = useParams();

  const [loading, setLoading] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string>("");
  const [batchIds, setBatchIds] = useState<string[]>([]);

  const [formData, setFormData] = useState<PlayerFormData>({
    displayName: "",
    kscaId: "",
    dob: "",
    fatherName: "",
    motherName: "",
    address: "",
    phone: "",
    parentsPhone: "",
    email: "",
    aadharNumber: "",
    gender: "",
    profession: "",
    batchIds: [],
    schoolOrCollege: "",
    skillLevel: "",
    battingStyle: "",
    bowlingStyle: "",
    previousRepresentation: "",
    joiningDate: "",
    notes: "",
    excludeFromAttendance: false,
  });

  // Load existing player data
  useEffect(() => {
    if (!playerPublicId) return;

    api
      .get(`/admin/players/${playerPublicId}/info`)
      .then((res) => {
        setFormData({
          displayName: res.data.displayName || "",
          kscaId: res.data.kscaId || "",
          dob: res.data.dob ? res.data.dob.split("T")[0] : "",
          fatherName: res.data.fatherName || "",
          motherName: res.data.motherName || "",
          address: res.data.address || "",
          phone: res.data.phone || "",
          parentsPhone: res.data.parentsPhone || "",
          email: res.data.email || "",
          aadharNumber: res.data.aadharNumber || "",
          gender: res.data.gender || "",
          profession: res.data.profession || "",
          batchIds: [],
          schoolOrCollege: res.data.schoolOrCollege || "",
          skillLevel: res.data.skillLevel || "",
          battingStyle: res.data.battingStyle || "",
          bowlingStyle: res.data.bowlingStyle || "",
          previousRepresentation: res.data.previousRepresentation || "",
          joiningDate: res.data.joiningDate
            ? res.data.joiningDate.split("T")[0]
            : "",
          notes: res.data.notes || "",
          excludeFromAttendance: res.data.excludeFromAttendance ?? false,
        });

        // Extract batch IDs from batches array
        if (res.data.batches && Array.isArray(res.data.batches)) {
          setBatchIds(res.data.batches.map((b: any) => b.id));
        }

        if (res.data.photoUrl) {
          setPhotoPreview(getImageUrl(res.data.photoUrl) || "");
        }
      })
      .catch(() => {
        toast.error("Failed to load player details");
        navigate(-1);
      });
  }, [playerPublicId, navigate]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  // Attendance exclusion toggles immediately via PATCH rather than waiting for full form save.
  const handleExcludeChange = async (val: boolean) => {
    setFormData((prev) => ({ ...prev, excludeFromAttendance: val }));
    try {
      await api.patch(`/admin/players/${playerPublicId}/attendance-exclusion`, {
        exclude: val,
      });
      toast.success(
        val ? "Excluded from attendance tracking" : "Included in attendance tracking",
      );
    } catch {
      setFormData((prev) => ({ ...prev, excludeFromAttendance: !val }));
      toast.error("Failed to update attendance exclusion");
    }
  };

  // Add these states alongside existing ones
  const [showCropper, setShowCropper] = useState(false);
  const [tempPhotoUrl, setTempPhotoUrl] = useState<string>("");
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area,
    quality: number = 0.85,
  ): Promise<Blob> => {
    const image = new Image();
    image.src = imageSrc;
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
    });
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;
    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      pixelCrop.width,
      pixelCrop.height,
    );
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Failed to process image — try a different photo"));
          return;
        }
        resolve(blob);
      }, "image/jpeg", quality);
    });
  };

  const applyCrop = async () => {
    if (!croppedAreaPixels || !tempPhotoUrl) return;
    try {
      const MAX_UPLOAD_SIZE = 4 * 1024 * 1024;
      let croppedBlob = await getCroppedImg(tempPhotoUrl, croppedAreaPixels, 0.85);

      if (croppedBlob.size > MAX_UPLOAD_SIZE) {
        croppedBlob = await getCroppedImg(tempPhotoUrl, croppedAreaPixels, 0.7);
      }
      if (croppedBlob.size > MAX_UPLOAD_SIZE) {
        croppedBlob = await getCroppedImg(tempPhotoUrl, croppedAreaPixels, 0.6);
      }
      if (croppedBlob.size > MAX_UPLOAD_SIZE) {
        toast.error(
          "Photo is too large after cropping — try a tighter crop or a different photo",
        );
        return;
      }

      const croppedFile = new File([croppedBlob], "player-photo.jpg", {
        type: "image/jpeg",
      });
      setPhotoFile(croppedFile);
      setPhotoPreview(URL.createObjectURL(croppedBlob));
      setShowCropper(false);
      setTempPhotoUrl("");
      toast.success("Photo cropped successfully!");
    } catch {
      toast.error("Failed to process image — try a different photo");
    }
  };

  const handlePhotoChange = (file: File | null) => {
    if (!file) {
      setPhotoFile(null);
      setPhotoPreview("");
      setTempPhotoUrl("");
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setTempPhotoUrl(reader.result as string);
      setShowCropper(true);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (loading) return;

    const { errors } = validatePlayerForm(formData, batchIds);

    if (errors.length > 0) {
      toast.error(errors[0]);
      return;
    }

    // ── Email uniqueness check (skip if email unchanged) ──────────
    if (formData.email?.trim()) {
      try {
        const res = await api.get("/admin/players/check-email", {
          params: {
            email: formData.email.trim(),
            excludePublicId: playerPublicId,
          },
        });
        if (res.data.exists) {
          toast.error("This email is already used by another player");
          return;
        }
      } catch {
        // non-blocking — proceed if check fails
      }
    }

    // ── Phone uniqueness check ─────────────────────────────────────
    if (formData.phone?.trim()) {
      if (!/^[6-9]\d{9}$/.test(formData.phone.trim())) {
        toast.error("Invalid phone number format");
        return;
      }
      try {
        const res = await api.get("/admin/players/check-phone", {
          params: {
            phone: formData.phone.trim(),
            excludePublicId: playerPublicId,
          },
        });
        if (res.data.exists) {
          toast.error("This phone number is already used by another player");
          return;
        }
      } catch {
        // non-blocking
      }
    }

    setLoading(true);

    try {
      const formDataToSend = new FormData();

      // Add batchIds to the player data
      const playerData = {
        ...formData,
        batchIds: batchIds,
      };

      formDataToSend.append(
        "player",
        new Blob([JSON.stringify(playerData)], {
          type: "application/json",
        }),
      );

      if (photoFile) {
        formDataToSend.append("photo", photoFile);
      }

      await api.put(`/admin/players/${playerPublicId}`, formDataToSend, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      toast.success("Player updated successfully");
      navigate(`/admin/players/${playerPublicId}/info`);
    } catch (error: any) {
      const status = error?.response?.status;
      const serverMsg: string = error?.response?.data?.message ?? "";
      const isSizeError =
        status === 413 ||
        serverMsg.toLowerCase().includes("maximum upload") ||
        serverMsg.toLowerCase().includes("file size") ||
        (photoFile !== null && !error?.response);
      toast.error(
        isSizeError
          ? "Photo file is too large — please try a smaller image or a tighter crop"
          : serverMsg || "Update failed",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-8">
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          className="p-2 hover:bg-gray-100 rounded-full transition"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="text-2xl font-bold">Update Player</h1>
          <p className="text-sm text-gray-500">Edit player information</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <PlayerForm
          formData={formData}
          onChange={handleChange}
          photoPreview={photoPreview}
          onPhotoChange={handlePhotoChange}
          submitLabel="Update Player"
          loading={loading}
          onCancel={() => navigate(-1)}
          batchIds={batchIds}
          onBatchChange={setBatchIds}
          excludeFromAttendance={formData.excludeFromAttendance ?? false}
          onExcludeChange={handleExcludeChange}
        />
      </form>

      {showCropper && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-xl flex flex-col">
            <div className="p-4 border-b flex-shrink-0">
              <h3 className="text-lg font-semibold">Adjust Photo</h3>
              <p className="text-xs text-gray-500 mt-1">
                Drag to reposition, use slider to zoom
              </p>
            </div>
            <div className="relative h-64 sm:h-80 md:h-96 bg-gray-900 flex-shrink-0">
              <Cropper
                image={tempPhotoUrl}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={onCropComplete}
                style={{ containerStyle: { width: "100%", height: "100%" } }}
              />
            </div>
            <div className="p-4 space-y-4 flex-shrink-0">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700">
                    Zoom
                  </label>
                  <span className="text-sm text-gray-500">
                    {Math.round(zoom * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.1}
                  value={zoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCropper(false);
                    setTempPhotoUrl("");
                  }}
                  className="flex-1 py-2.5 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={applyCrop}
                  className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition"
                >
                  Apply Crop
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export function validatePlayerForm(
  formData: PlayerFormData,
  batchIds: string[],
) {
  const errors: string[] = [];
  const fieldErrors: Record<string, boolean> = {};

  if (!formData.displayName?.trim()) {
    errors.push("Full Name is required");
    fieldErrors.displayName = true;
  }

  if (!formData.gender) {
    errors.push("Gender is required");
    fieldErrors.gender = true;
  }

  if (!formData.profession) {
    errors.push("Profession is required");
    fieldErrors.profession = true;
  }

  if (!formData.dob) {
    errors.push("Date of Birth is required");
    fieldErrors.dob = true;
  } else if (new Date(formData.dob) > new Date()) {
    errors.push("Date of Birth cannot be in the future");
    fieldErrors.dob = true;
  }

  if (!formData.address?.trim()) {
    errors.push("Address is required");
    fieldErrors.address = true;
  }

  if (formData.email?.trim()) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      errors.push("Invalid email format");
      fieldErrors.email = true;
    }
  }

  if (!formData.parentsPhone?.trim()) {
    errors.push("Parent Phone is required");
    fieldErrors.parentsPhone = true;
  }

  if (batchIds.length === 0) {
    errors.push("At least one batch must be selected");
    fieldErrors.batchIds = true;
  }

  return { errors, fieldErrors };
}

export default UpdatePlayer;
